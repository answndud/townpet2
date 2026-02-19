CREATE TYPE "CommentReactionType" AS ENUM ('LIKE', 'DISLIKE');

ALTER TABLE "Comment"
  ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dislikeCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CommentReaction" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "CommentReactionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentReaction_commentId_userId_key"
ON "CommentReaction"("commentId", "userId");

CREATE INDEX "CommentReaction_commentId_type_idx"
ON "CommentReaction"("commentId", "type");

CREATE INDEX "CommentReaction_userId_createdAt_idx"
ON "CommentReaction"("userId", "createdAt" DESC);

ALTER TABLE "CommentReaction"
  ADD CONSTRAINT "CommentReaction_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentReaction"
  ADD CONSTRAINT "CommentReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
