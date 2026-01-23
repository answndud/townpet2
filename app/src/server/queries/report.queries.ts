import { ReportStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type ReportListOptions = {
  status?: ReportStatus;
};

export async function listReports({ status }: ReportListOptions = {}) {
  return prisma.report.findMany({
    where: { status: status ?? ReportStatus.PENDING },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { id: true, email: true, nickname: true } },
      post: { select: { id: true, title: true, status: true } },
    },
  });
}
