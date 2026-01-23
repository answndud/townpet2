import { prisma } from "@/lib/prisma";

export async function listReportAuditsByReportIds(reportIds: string[]) {
  if (reportIds.length === 0) {
    return [];
  }

  return prisma.reportAudit.findMany({
    where: { reportId: { in: reportIds } },
    orderBy: { createdAt: "desc" },
    include: {
      resolver: { select: { id: true, email: true, nickname: true } },
    },
  });
}
