DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoardScope') THEN
    CREATE TYPE "BoardScope" AS ENUM ('COMMUNITY', 'COMMON');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommonBoardType') THEN
    CREATE TYPE "CommonBoardType" AS ENUM ('HOSPITAL', 'LOST_FOUND', 'MARKET');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CommunityCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "labelKo" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Community" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityCategory_slug_key" ON "CommunityCategory"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Community_slug_key" ON "Community"("slug");
CREATE INDEX IF NOT EXISTS "Community_categoryId_sortOrder_idx" ON "Community"("categoryId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Community_categoryId_fkey'
  ) THEN
    ALTER TABLE "Community"
    ADD CONSTRAINT "Community_categoryId_fkey"
    FOREIGN KEY ("categoryId")
    REFERENCES "CommunityCategory"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "boardScope" "BoardScope" NOT NULL DEFAULT 'COMMUNITY';
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "communityId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "commonBoardType" "CommonBoardType";
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "animalTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Post"
SET "animalTags" = ARRAY[]::TEXT[]
WHERE "animalTags" IS NULL;

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
WHERE "type" IN ('HOSPITAL_REVIEW'::"PostType", 'LOST_FOUND'::"PostType", 'MARKET_LISTING'::"PostType");

UPDATE "Post"
SET "boardScope" = 'COMMUNITY'
WHERE "boardScope" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Post_boardScope_consistency_check'
  ) THEN
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
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Post_boardScope_createdAt_idx" ON "Post"("boardScope", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_communityId_createdAt_idx" ON "Post"("communityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_commonBoardType_createdAt_idx" ON "Post"("commonBoardType", "createdAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Post_communityId_fkey'
  ) THEN
    ALTER TABLE "Post"
    ADD CONSTRAINT "Post_communityId_fkey"
    FOREIGN KEY ("communityId")
    REFERENCES "Community"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "CommunityCategory" ("id", "slug", "labelKo", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('seed-cc-dogs', 'dogs', '강아지', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-cats', 'cats', '고양이', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-birds', 'birds', '조류', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-reptiles', 'reptiles', '파충류', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-small-pets', 'small-pets', '소동물', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-aquatics', 'aquatics', '어류/수조', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-amphibians', 'amphibians', '양서류', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-arthropods', 'arthropods', '절지류/곤충', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-cc-special-others', 'special-others', '특수동물/기타', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET
  "labelKo" = EXCLUDED."labelKo",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Community" (
  "id",
  "categoryId",
  "slug",
  "labelKo",
  "sortOrder",
  "isActive",
  "tags",
  "defaultPostTypes",
  "createdAt",
  "updatedAt"
)
VALUES
  ('seed-c-dogs', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'dogs'), 'dogs', '강아지', 1, true, ARRAY['훈련','산책','사료','건강','행동']::TEXT[], ARRAY['FREE_BOARD','QA_QUESTION','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-cats', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'cats'), 'cats', '고양이', 2, true, ARRAY['화장실','사료','스크래처','건강','행동']::TEXT[], ARRAY['FREE_BOARD','QA_QUESTION','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-birds', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'birds'), 'birds', '조류', 3, true, ARRAY['케이지','먹이','소음','건강','핸들링']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-parrots', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'birds'), 'parrots', '앵무새', 4, true, ARRAY['훈련','발성','장난감','케이지','영양']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-reptiles', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'reptiles'), 'reptiles', '파충류', 5, true, ARRAY['온습도','UVB','사육장','먹이','탈피']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-lizards', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'reptiles'), 'lizards', '도마뱀', 6, true, ARRAY['온습도','급이','바닥재','탈피','행동']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-snakes', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'reptiles'), 'snakes', '뱀', 7, true, ARRAY['급이','은신처','탈피','핸들링','온도']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-turtles', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'reptiles'), 'turtles', '거북', 8, true, ARRAY['여과','수질','일광욕','먹이','성장']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-small-pets', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'small-pets'), 'small-pets', '소동물', 9, true, ARRAY['케이지','깔짚','먹이','건강','합사']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-aquatics', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'aquatics'), 'aquatics', '어류·수조', 10, true, ARRAY['수질','여과기','수초','합사','질병']::TEXT[], ARRAY['QA_QUESTION','PRODUCT_REVIEW','FREE_BOARD','PET_SHOWCASE']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-amphibians', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'amphibians'), 'amphibians', '양서류', 11, true, ARRAY['습도','은신처','급이','수질','환경세팅']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-c-arthropods', (SELECT "id" FROM "CommunityCategory" WHERE "slug" = 'arthropods'), 'arthropods', '절지류·곤충', 12, true, ARRAY['탈피','은신처','먹이','습도','번식']::TEXT[], ARRAY['QA_QUESTION','FREE_BOARD','PET_SHOWCASE','PRODUCT_REVIEW']::"PostType"[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE
SET
  "categoryId" = EXCLUDED."categoryId",
  "labelKo" = EXCLUDED."labelKo",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "tags" = EXCLUDED."tags",
  "defaultPostTypes" = EXCLUDED."defaultPostTypes",
  "updatedAt" = CURRENT_TIMESTAMP;
