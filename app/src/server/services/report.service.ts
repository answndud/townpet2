import { PostStatus, Prisma, ReportStatus, ReportTarget } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { reportCreateSchema } from "@/lib/validations/report";
import { reportBulkActionSchema } from "@/lib/validations/report-bulk";
import { reportUpdateSchema } from "@/lib/validations/report-update";
import {
  bumpFeedCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";
import { hasBlockingRelation } from "@/server/queries/user-relation.queries";
import {
  formatSanctionLevelLabel,
  issueNextUserSanction,
} from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";

const AUTO_HIDE_THRESHOLD = 3;

async function resolvePostReportTargetUserId(
  tx: Prisma.TransactionClient,
  targetId: string,
) {
  const post = await tx.post.findUnique({
    where: { id: targetId },
    select: { authorId: true },
  });
  return post?.authorId ?? null;
}

type CreateReportParams = {
  reporterId: string;
  input: unknown;
};

export async function createReport({ reporterId, input }: CreateReportParams) {
  const parsed = reportCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("신고 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.report.findFirst({
    where: {
      reporterId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
    },
  });

  if (existing) {
    throw new ServiceError("이미 신고한 대상입니다.", "DUPLICATE_REPORT", 409);
  }

  let shouldBumpCache = false;
  const report = await prisma.$transaction(async (tx) => {
    const targetUserId = await resolvePostReportTargetUserId(tx, parsed.data.targetId);

    if (!targetUserId) {
      throw new ServiceError("신고 대상을 찾을 수 없습니다.", "REPORT_TARGET_NOT_FOUND", 404);
    }
    if (targetUserId === reporterId) {
      throw new ServiceError("자기 자신은 신고할 수 없습니다.", "INVALID_TARGET", 400);
    }
    if (await hasBlockingRelation(reporterId, targetUserId)) {
      throw new ServiceError(
        "차단 관계에서는 신고를 접수할 수 없습니다.",
        "USER_BLOCK_RELATION",
        403,
      );
    }

    const report = await tx.report.create({
      data: {
        reporterId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        targetUserId,
        reason: parsed.data.reason,
        description: parsed.data.description,
        status: ReportStatus.PENDING,
      },
    });

    const count = await tx.report.count({
      where: {
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      },
    });

    if (count >= AUTO_HIDE_THRESHOLD) {
      await tx.post.update({
        where: { id: parsed.data.targetId },
        data: { status: PostStatus.HIDDEN },
      });
      shouldBumpCache = true;
    }

    return report;
  });
  if (shouldBumpCache) {
    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpSearchCacheVersion().catch(() => undefined);
    void bumpSuggestCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
  }
  return report;
}

type UpdateReportParams = {
  reportId: string;
  input: unknown;
  moderatorId: string;
};

export async function updateReport({
  reportId,
  input,
  moderatorId,
}: UpdateReportParams) {
  const parsed = reportUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("처리 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  let shouldBumpCache = false;
  const transactionResult = await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: {
        post: {
          select: { id: true, authorId: true },
        },
      },
    });

    if (!report) {
      throw new ServiceError("신고를 찾을 수 없습니다.", "REPORT_NOT_FOUND", 404);
    }

    if (report.targetType !== ReportTarget.POST) {
      throw new ServiceError(
        "현재 운영에서는 게시글 신고만 처리할 수 있습니다.",
        "UNSUPPORTED_REPORT_TARGET",
        409,
      );
    }

    const updated = await tx.report.update({
      where: { id: reportId },
      data: {
        status: parsed.data.status,
        resolution: parsed.data.resolution,
        resolvedAt: new Date(),
        resolvedBy: moderatorId,
      },
    });

    await tx.reportAudit.create({
      data: {
        reportId: report.id,
        status: parsed.data.status,
        resolution: parsed.data.resolution,
        resolvedBy: moderatorId,
      },
    });

    if (report.post && parsed.data.status === ReportStatus.DISMISSED) {
      await tx.post.update({
        where: { id: report.targetId },
        data: { status: PostStatus.ACTIVE },
      });
      shouldBumpCache = true;
    }

    let targetUserId = report.targetUserId;
    if (!targetUserId) {
      targetUserId = report.post?.authorId ?? null;
    }

    return {
      updated,
      targetUserId,
    };
  });

  if (
    parsed.data.status === ReportStatus.RESOLVED &&
    parsed.data.applySanction &&
    transactionResult.targetUserId &&
    transactionResult.targetUserId !== moderatorId
  ) {
    const sanction = await issueNextUserSanction({
      userId: transactionResult.targetUserId,
      moderatorId,
      reason:
        parsed.data.resolution?.trim() || "신고 승인에 따른 단계적 제재",
      sourceReportId: reportId,
    });

    if (sanction) {
      return {
        ...transactionResult.updated,
        sanctionLevel: sanction.level,
        sanctionLabel: formatSanctionLevelLabel(sanction.level),
      };
    }
  }

  if (shouldBumpCache) {
    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpSearchCacheVersion().catch(() => undefined);
    void bumpSuggestCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
  }

  return transactionResult.updated;
}

type BulkUpdateReportsParams = {
  input: unknown;
  moderatorId: string;
};

export async function bulkUpdateReports({ input, moderatorId }: BulkUpdateReportsParams) {
  const parsed = reportBulkActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("일괄 처리 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const { reportIds, action, resolution } = parsed.data;
  let shouldBumpCache = false;
  const result = await prisma.$transaction(async (tx) => {
    const reports = await tx.report.findMany({
      where: { id: { in: reportIds } },
      select: { id: true, targetType: true, targetId: true },
    });

    if (reports.length === 0) {
      throw new ServiceError("처리할 신고가 없습니다.", "REPORT_NOT_FOUND", 404);
    }

    const unsupportedReports = reports.filter(
      (report) => report.targetType !== ReportTarget.POST,
    );
    if (unsupportedReports.length > 0) {
      throw new ServiceError(
        "현재 운영에서는 게시글 신고만 일괄 처리할 수 있습니다.",
        "UNSUPPORTED_REPORT_TARGET",
        409,
      );
    }

    const now = new Date();
    const status =
      action === "RESOLVE" || action === "HIDE_POST"
        ? ReportStatus.RESOLVED
        : ReportStatus.DISMISSED;

    await tx.report.updateMany({
      where: { id: { in: reportIds } },
      data: {
        status,
        resolution,
        resolvedAt: now,
        resolvedBy: moderatorId,
      },
    });

    await tx.reportAudit.createMany({
      data: reports.map((report) => ({
        reportId: report.id,
        status,
        resolution,
        resolvedBy: moderatorId,
      })),
    });

    const postTargetIds = reports
      .filter((report) => report.targetType === ReportTarget.POST)
      .map((report) => report.targetId);

    if (postTargetIds.length > 0) {
      if (action === "HIDE_POST") {
        await tx.post.updateMany({
          where: { id: { in: postTargetIds } },
          data: { status: PostStatus.HIDDEN },
        });
      }

      if (action === "UNHIDE_POST" || action === "DISMISS") {
        await tx.post.updateMany({
          where: { id: { in: postTargetIds } },
          data: { status: PostStatus.ACTIVE },
        });
      }

      if (action === "HIDE_POST" || action === "UNHIDE_POST" || action === "DISMISS") {
        shouldBumpCache = true;
      }
    }

    return { count: reports.length, status };
  });

  if (shouldBumpCache) {
    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpSearchCacheVersion().catch(() => undefined);
    void bumpSuggestCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
  }
  return result;
}
