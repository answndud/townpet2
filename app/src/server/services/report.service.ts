import { PostStatus, ReportStatus, ReportTarget } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { reportCreateSchema } from "@/lib/validations/report";
import { reportBulkActionSchema } from "@/lib/validations/report-bulk";
import { reportUpdateSchema } from "@/lib/validations/report-update";
import { ServiceError } from "@/server/services/service-error";

const AUTO_HIDE_THRESHOLD = 3;

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

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        reporterId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        reason: parsed.data.reason,
        description: parsed.data.description,
        status: ReportStatus.PENDING,
      },
    });

    if (parsed.data.targetType === ReportTarget.POST) {
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
      }
    }

    return report;
  });
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

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: { post: true },
    });

    if (!report) {
      throw new ServiceError("신고를 찾을 수 없습니다.", "REPORT_NOT_FOUND", 404);
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

    if (report.targetType === ReportTarget.POST && report.post) {
      if (parsed.data.status === ReportStatus.DISMISSED) {
        await tx.post.update({
          where: { id: report.targetId },
          data: { status: PostStatus.ACTIVE },
        });
      }
    }

    return updated;
  });
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

  return prisma.$transaction(async (tx) => {
    const reports = await tx.report.findMany({
      where: { id: { in: reportIds } },
      select: { id: true, targetType: true, targetId: true },
    });

    if (reports.length === 0) {
      throw new ServiceError("처리할 신고가 없습니다.", "REPORT_NOT_FOUND", 404);
    }

    const now = new Date();
    const status =
      action === "RESOLVE" || action === "HIDE_POST"
        ? ReportStatus.RESOLVED
        : ReportStatus.DISMISSED;

    if (action === "HIDE_POST" || action === "UNHIDE_POST") {
      const nonPostReports = reports.filter(
        (report) => report.targetType !== ReportTarget.POST,
      );

      if (nonPostReports.length > 0) {
        throw new ServiceError(
          "게시글 대상 신고만 숨김 처리할 수 있습니다.",
          "INVALID_TARGET",
          400,
        );
      }
    }

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
    }

    return { count: reports.length, status };
  });
}
