ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Notification_userId_archivedAt_createdAt_idx"
ON "Notification"("userId", "archivedAt", "createdAt" DESC);
