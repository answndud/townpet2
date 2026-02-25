-- CreateEnum
CREATE TYPE "BoardScope" AS ENUM ('COMMUNITY', 'COMMON');

-- CreateEnum
CREATE TYPE "CommonBoardType" AS ENUM ('HOSPITAL', 'LOST_FOUND', 'MARKET');

-- CreateTable
CREATE TABLE "CommunityCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelKo" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelKo" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "defaultPostTypes" "PostType"[] NOT NULL DEFAULT ARRAY[]::"PostType"[],
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Post"
ADD COLUMN "boardScope" "BoardScope" NOT NULL DEFAULT 'COMMUNITY',
ADD COLUMN "communityId" TEXT,
ADD COLUMN "commonBoardType" "CommonBoardType",
ADD COLUMN "animalTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill legacy posts that belong to common boards
UPDATE "Post"
SET
    "boardScope" = 'COMMON',
    "communityId" = NULL,
    "commonBoardType" = CASE
        WHEN "type" = 'HOSPITAL_REVIEW'::"PostType" THEN 'HOSPITAL'::"CommonBoardType"
        WHEN "type" = 'LOST_FOUND'::"PostType" THEN 'LOST_FOUND'::"CommonBoardType"
        WHEN "type" = 'MARKET_LISTING'::"PostType" THEN 'MARKET'::"CommonBoardType"
        ELSE "commonBoardType"
    END
WHERE "type" IN (
    'HOSPITAL_REVIEW'::"PostType",
    'LOST_FOUND'::"PostType",
    'MARKET_LISTING'::"PostType"
);

-- Keep board scope and board foreign fields consistent
ALTER TABLE "Post"
ADD CONSTRAINT "Post_boardScope_consistency_check"
CHECK (
    (
        "boardScope" = 'COMMON'::"BoardScope"
        AND "communityId" IS NULL
        AND "commonBoardType" IS NOT NULL
    )
    OR (
        "boardScope" = 'COMMUNITY'::"BoardScope"
        AND "commonBoardType" IS NULL
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityCategory_slug_key" ON "CommunityCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_categoryId_sortOrder_idx" ON "Community"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Post_boardScope_createdAt_idx" ON "Post"("boardScope", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_communityId_createdAt_idx" ON "Post"("communityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_commonBoardType_createdAt_idx" ON "Post"("commonBoardType", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CommunityCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;
