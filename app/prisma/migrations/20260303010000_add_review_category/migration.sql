-- CreateEnum
CREATE TYPE "ReviewCategory" AS ENUM ('SUPPLIES', 'FEED', 'SNACK', 'TOY', 'PLACE', 'ETC');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "reviewCategory" "ReviewCategory";

-- Backfill legacy review post types
UPDATE "Post"
SET "reviewCategory" = 'PLACE'
WHERE "type" = 'PLACE_REVIEW' AND "reviewCategory" IS NULL;

UPDATE "Post"
SET "reviewCategory" = 'SUPPLIES'
WHERE "type" = 'PRODUCT_REVIEW' AND "reviewCategory" IS NULL;
