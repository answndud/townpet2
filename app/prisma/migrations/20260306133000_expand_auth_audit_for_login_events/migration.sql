ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_SUCCESS';
ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_FAILURE';
ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_RATE_LIMITED';

ALTER TABLE "AuthAuditLog"
ADD COLUMN     "identifierHash" TEXT,
ADD COLUMN     "identifierLabel" TEXT,
ADD COLUMN     "reasonCode" TEXT,
ALTER COLUMN   "userId" DROP NOT NULL;

CREATE INDEX "AuthAuditLog_identifierHash_createdAt_idx"
ON "AuthAuditLog"("identifierHash", "createdAt" DESC);

CREATE INDEX "AuthAuditLog_action_createdAt_idx"
ON "AuthAuditLog"("action", "createdAt" DESC);

CREATE INDEX "AuthAuditLog_ipAddress_createdAt_idx"
ON "AuthAuditLog"("ipAddress", "createdAt" DESC);
