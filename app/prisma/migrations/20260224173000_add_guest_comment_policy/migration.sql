-- AlterTable
ALTER TABLE "Comment"
ADD COLUMN "guestDisplayName" TEXT,
ADD COLUMN "guestPasswordHash" TEXT,
ADD COLUMN "guestIpHash" TEXT,
ADD COLUMN "guestFingerprintHash" TEXT;

-- CreateIndex
CREATE INDEX "Comment_guestIpHash_createdAt_idx" ON "Comment"("guestIpHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Comment_guestFingerprintHash_createdAt_idx" ON "Comment"("guestFingerprintHash", "createdAt" DESC);
