-- CreateTable
CREATE TABLE "ReportAudit" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL,
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportAudit_reportId_createdAt_idx" ON "ReportAudit"("reportId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ReportAudit" ADD CONSTRAINT "ReportAudit_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAudit" ADD CONSTRAINT "ReportAudit_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
