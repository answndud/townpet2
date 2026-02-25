-- AlterTable
ALTER TABLE "Post"
ADD COLUMN "guestDisplayName" TEXT,
ADD COLUMN "guestPasswordHash" TEXT,
ADD COLUMN "guestIpHash" TEXT,
ADD COLUMN "guestFingerprintHash" TEXT;

-- CreateTable
CREATE TABLE "GuestBan" (
  "id" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "fingerprintHash" TEXT,
  "reason" TEXT NOT NULL,
  "source" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestBan_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "GuestViolationCategory" AS ENUM ('SPAM', 'ADULT', 'RUMOR', 'POLICY');

-- CreateTable
CREATE TABLE "GuestViolation" (
  "id" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "fingerprintHash" TEXT,
  "category" "GuestViolationCategory" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_guestIpHash_createdAt_idx" ON "Post"("guestIpHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_guestFingerprintHash_createdAt_idx" ON "Post"("guestFingerprintHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GuestBan_ipHash_expiresAt_idx" ON "GuestBan"("ipHash", "expiresAt");

-- CreateIndex
CREATE INDEX "GuestBan_fingerprintHash_expiresAt_idx" ON "GuestBan"("fingerprintHash", "expiresAt");

-- CreateIndex
CREATE INDEX "GuestViolation_ipHash_createdAt_idx" ON "GuestViolation"("ipHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GuestViolation_fingerprintHash_createdAt_idx" ON "GuestViolation"("fingerprintHash", "createdAt" DESC);
