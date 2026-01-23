import { PostStatus, ReportStatus, ReportTarget } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { reportCreateSchema } from "@/lib/validations/report";
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
