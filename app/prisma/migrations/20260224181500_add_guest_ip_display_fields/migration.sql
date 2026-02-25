-- AlterTable
ALTER TABLE "Post"
ADD COLUMN "guestIpDisplay" TEXT,
ADD COLUMN "guestIpLabel" TEXT;

-- AlterTable
ALTER TABLE "Comment"
ADD COLUMN "guestIpDisplay" TEXT,
ADD COLUMN "guestIpLabel" TEXT;
