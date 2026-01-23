-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PostType" ADD VALUE 'FREE_BOARD';
ALTER TYPE "PostType" ADD VALUE 'DAILY_SHARE';
ALTER TYPE "PostType" ADD VALUE 'PRODUCT_REVIEW';
ALTER TYPE "PostType" ADD VALUE 'PET_SHOWCASE';
