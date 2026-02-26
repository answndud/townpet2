import { ReportReason, ReportStatus, ReportTarget } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type ReportListOptions = {
  status?: ReportStatus | "ALL";
  targetType?: ReportTarget | "ALL";
};

export async function listReports({ status, targetType }: ReportListOptions = {}) {
  const statusFilter = status ?? ReportStatus.PENDING;

  return prisma.report.findMany({
    where: {
      ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
      ...(targetType && targetType !== "ALL" ? { targetType } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, email: true, nickname: true } },
      post: { select: { id: true, title: true, status: true } },
    },
  });
}

export type ReportStats = {
  totalCount: number;
  statusCounts: Record<ReportStatus, number>;
  reasonCounts: Record<ReportReason, number>;
  targetCounts: Record<ReportTarget, number>;
  dailyCounts: { date: string; count: number }[];
  averageResolutionHours: number | null;
};

export async function getReportStats(days = 7): Promise<ReportStats> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const [totalCount, statusGroups, reasonGroups, targetGroups, recentReports, resolvedReports] =
    await prisma.$transaction([
      prisma.report.count(),
      prisma.report.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.report.groupBy({
        by: ["reason"],
        orderBy: { reason: "asc" },
        _count: { _all: true },
      }),
      prisma.report.groupBy({
        by: ["targetType"],
        orderBy: { targetType: "asc" },
        _count: { _all: true },
      }),
      prisma.report.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      prisma.report.findMany({
        where: { resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

  const statusCounts = Object.values(ReportStatus).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<ReportStatus, number>,
  );
  const getGroupCount = (count: true | { _all?: number } | undefined) =>
    typeof count === "object" && count ? count._all ?? 0 : 0;

  for (const group of statusGroups) {
    statusCounts[group.status] = getGroupCount(group._count);
  }

  const reasonCounts = Object.values(ReportReason).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<ReportReason, number>,
  );
  for (const group of reasonGroups) {
    reasonCounts[group.reason] = getGroupCount(group._count);
  }

  const targetCounts = Object.values(ReportTarget).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<ReportTarget, number>,
  );
  for (const group of targetGroups) {
    targetCounts[group.targetType] = getGroupCount(group._count);
  }

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dailyMap.set(date.toISOString().slice(0, 10), 0);
  }

  for (const report of recentReports) {
    const key = report.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }

  const dailyCounts = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const resolutionDurations = resolvedReports
    .flatMap((report) =>
      report.resolvedAt
        ? [report.resolvedAt.getTime() - report.createdAt.getTime()]
        : [],
    )
    .filter((value) => value >= 0);

  const averageResolutionHours =
    resolutionDurations.length > 0
      ? resolutionDurations.reduce((sum, value) => sum + value, 0) /
        resolutionDurations.length /
        (1000 * 60 * 60)
      : null;

  return {
    totalCount,
    statusCounts,
    reasonCounts,
    targetCounts,
    dailyCounts,
    averageResolutionHours,
  };
}

export async function getReportById(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, email: true, nickname: true } },
      post: { select: { id: true, title: true, status: true } },
    },
  });
}
