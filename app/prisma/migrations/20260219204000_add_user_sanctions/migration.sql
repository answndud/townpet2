-- CreateEnum
CREATE TYPE "SanctionLevel" AS ENUM ('WARNING', 'SUSPEND_7D', 'SUSPEND_30D', 'PERMANENT_BAN');

-- CreateTable
CREATE TABLE "UserSanction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "level" "SanctionLevel" NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceReportId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSanction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSanction_userId_createdAt_idx" ON "UserSanction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserSanction_userId_expiresAt_idx" ON "UserSanction"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "UserSanction_sourceReportId_idx" ON "UserSanction"("sourceReportId");

-- AddForeignKey
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSanction" ADD CONSTRAINT "UserSanction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
