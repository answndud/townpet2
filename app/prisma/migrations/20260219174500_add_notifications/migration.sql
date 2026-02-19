CREATE TYPE "NotificationType" AS ENUM ('COMMENT_ON_POST', 'REPLY_TO_COMMENT', 'REACTION_ON_POST', 'SYSTEM');

CREATE TYPE "NotificationEntityType" AS ENUM ('POST', 'COMMENT', 'REACTION', 'SYSTEM');

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "NotificationType" NOT NULL,
  "entityType" "NotificationEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "postId" TEXT,
  "commentId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "metadata" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_isRead_createdAt_idx"
ON "Notification"("userId", "isRead", "createdAt" DESC);

CREATE INDEX "Notification_userId_createdAt_idx"
ON "Notification"("userId", "createdAt" DESC);

CREATE INDEX "Notification_entityType_entityId_idx"
ON "Notification"("entityType", "entityId");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
