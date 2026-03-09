-- AlterEnum
-- This migration adds more than one value to enums.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "PostType" ADD VALUE 'ADOPTION_LISTING';
ALTER TYPE "PostType" ADD VALUE 'SHELTER_VOLUNTEER';
ALTER TYPE "CommonBoardType" ADD VALUE 'ADOPTION';
ALTER TYPE "CommonBoardType" ADD VALUE 'VOLUNTEER';

-- CreateEnum
CREATE TYPE "AnimalSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AdoptionStatus" AS ENUM ('OPEN', 'RESERVED', 'ADOPTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VolunteerRecruitmentStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AdoptionListing" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "shelterName" TEXT,
    "region" TEXT,
    "animalType" TEXT,
    "breed" TEXT,
    "ageLabel" TEXT,
    "sex" "AnimalSex",
    "isNeutered" BOOLEAN,
    "isVaccinated" BOOLEAN,
    "sizeLabel" TEXT,
    "status" "AdoptionStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "AdoptionListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerRecruitment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "shelterName" TEXT,
    "region" TEXT,
    "volunteerDate" TIMESTAMP(3),
    "volunteerType" TEXT,
    "capacity" INTEGER,
    "status" "VolunteerRecruitmentStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "VolunteerRecruitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdoptionListing_postId_key" ON "AdoptionListing"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerRecruitment_postId_key" ON "VolunteerRecruitment"("postId");

-- AddForeignKey
ALTER TABLE "AdoptionListing" ADD CONSTRAINT "AdoptionListing_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerRecruitment" ADD CONSTRAINT "VolunteerRecruitment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
