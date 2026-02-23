-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('DOG', 'CAT');

-- CreateEnum
CREATE TYPE "PetSizeClass" AS ENUM ('TOY', 'SMALL', 'MEDIUM', 'LARGE', 'GIANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PetLifeStage" AS ENUM ('PUPPY_KITTEN', 'YOUNG', 'ADULT', 'SENIOR', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Pet"
ADD COLUMN "breedCode" TEXT,
ADD COLUMN "breedLabel" TEXT,
ADD COLUMN "sizeClass" "PetSizeClass" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "lifeStage" "PetLifeStage" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "speciesV2" "PetSpecies";

-- Data migration: free-text species to enum + breedLabel
UPDATE "Pet"
SET
  "speciesV2" = CASE
    WHEN "species" ILIKE '%고양이%' THEN 'CAT'::"PetSpecies"
    WHEN "species" ILIKE '%냥%' THEN 'CAT'::"PetSpecies"
    WHEN "species" ILIKE '%cat%' THEN 'CAT'::"PetSpecies"
    ELSE 'DOG'::"PetSpecies"
  END,
  "breedLabel" = CASE
    WHEN trim("species") = '' THEN NULL
    WHEN lower(trim("species")) IN ('dog', 'cat', '개', '강아지', '고양이') THEN NULL
    ELSE trim("species")
  END;

ALTER TABLE "Pet"
ALTER COLUMN "speciesV2" SET NOT NULL;

ALTER TABLE "Pet"
DROP COLUMN "species";

ALTER TABLE "Pet"
RENAME COLUMN "speciesV2" TO "species";

-- CreateTable
CREATE TABLE "BreedCatalog" (
    "id" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "code" TEXT NOT NULL,
    "labelKo" TEXT NOT NULL,
    "aliases" TEXT[],
    "defaultSize" "PetSizeClass" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreedCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAudienceSegment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "species" "PetSpecies",
    "breedCode" TEXT,
    "sizeClass" "PetSizeClass",
    "lifeStage" "PetLifeStage",
    "interestTags" TEXT[],
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAudienceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BreedCatalog_species_code_key" ON "BreedCatalog"("species", "code");

-- CreateIndex
CREATE INDEX "BreedCatalog_species_labelKo_idx" ON "BreedCatalog"("species", "labelKo");

-- CreateIndex
CREATE INDEX "Pet_species_breedCode_idx" ON "Pet"("species", "breedCode");

-- CreateIndex
CREATE INDEX "Pet_sizeClass_lifeStage_idx" ON "Pet"("sizeClass", "lifeStage");

-- CreateIndex
CREATE INDEX "UserAudienceSegment_userId_idx" ON "UserAudienceSegment"("userId");

-- CreateIndex
CREATE INDEX "UserAudienceSegment_species_breedCode_sizeClass_lifeStage_idx" ON "UserAudienceSegment"("species", "breedCode", "sizeClass", "lifeStage");

-- AddForeignKey
ALTER TABLE "UserAudienceSegment" ADD CONSTRAINT "UserAudienceSegment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
