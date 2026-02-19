import { ReportStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type ReportAuditListOptions = {
  reportId: string;
  query?: string;
  order?: "desc" | "asc";
};

export async function listReportAuditsByReportIds(reportIds: string[]) {
  if (reportIds.length === 0) {
    return [];
  }

  return prisma.reportAudit.findMany({
    where: { reportId: { in: reportIds } },
    orderBy: { createdAt: "desc" },
    include: {
      resolver: { select: { id: true, email: true, nickname: true, name: true } },
    },
  });
}

export async function listReportAudits({ reportId, query, order }: ReportAuditListOptions) {
  const trimmedQuery = query?.trim();
  const statusQuery = trimmedQuery?.toUpperCase();
  const statusFilter: ReportStatus | null =
    statusQuery === "PENDING" || statusQuery === "RESOLVED" || statusQuery === "DISMISSED"
      ? (statusQuery as ReportStatus)
      : null;

  return prisma.reportAudit.findMany({
    where: {
      reportId,
      ...(trimmedQuery
        ? {
            OR: [
              { resolution: { contains: trimmedQuery, mode: "insensitive" } },
              { resolvedBy: { contains: trimmedQuery, mode: "insensitive" } },
              ...(statusFilter ? [{ status: statusFilter }] : []),
              {
                resolver: {
                  OR: [
                    { nickname: { contains: trimmedQuery, mode: "insensitive" } },
                    { email: { contains: trimmedQuery, mode: "insensitive" } },
                    { name: { contains: trimmedQuery, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: order ?? "desc" },
    include: {
      resolver: { select: { id: true, email: true, nickname: true, name: true } },
    },
  });
}
