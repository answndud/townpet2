ALTER TABLE "Post"
ADD COLUMN "structuredSearchText" TEXT NOT NULL DEFAULT '';

UPDATE "Post" p
SET "structuredSearchText" = TRIM(
  REGEXP_REPLACE(
    CONCAT_WS(
      ' ',
      COALESCE(array_to_string(p."animalTags", ' '), ''),
      COALESCE((SELECT hr."hospitalName" FROM "HospitalReview" hr WHERE hr."postId" = p."id"), ''),
      COALESCE((SELECT hr."treatmentType" FROM "HospitalReview" hr WHERE hr."postId" = p."id"), ''),
      COALESCE((SELECT pr."placeName" FROM "PlaceReview" pr WHERE pr."postId" = p."id"), ''),
      COALESCE((SELECT pr."placeType" FROM "PlaceReview" pr WHERE pr."postId" = p."id"), ''),
      COALESCE((SELECT pr."address" FROM "PlaceReview" pr WHERE pr."postId" = p."id"), ''),
      COALESCE((SELECT wr."routeName" FROM "WalkRoute" wr WHERE wr."postId" = p."id"), ''),
      COALESCE((SELECT array_to_string(wr."safetyTags", ' ') FROM "WalkRoute" wr WHERE wr."postId" = p."id"), ''),
      COALESCE((SELECT al."shelterName" FROM "AdoptionListing" al WHERE al."postId" = p."id"), ''),
      COALESCE((SELECT al."region" FROM "AdoptionListing" al WHERE al."postId" = p."id"), ''),
      COALESCE((SELECT al."animalType" FROM "AdoptionListing" al WHERE al."postId" = p."id"), ''),
      COALESCE((SELECT al."breed" FROM "AdoptionListing" al WHERE al."postId" = p."id"), ''),
      COALESCE((SELECT al."ageLabel" FROM "AdoptionListing" al WHERE al."postId" = p."id"), ''),
      COALESCE((SELECT al."sizeLabel" FROM "AdoptionListing" al WHERE al."postId" = p."id"), ''),
      COALESCE((SELECT vr."shelterName" FROM "VolunteerRecruitment" vr WHERE vr."postId" = p."id"), ''),
      COALESCE((SELECT vr."region" FROM "VolunteerRecruitment" vr WHERE vr."postId" = p."id"), ''),
      COALESCE((SELECT vr."volunteerType" FROM "VolunteerRecruitment" vr WHERE vr."postId" = p."id"), '')
    ),
    '\s+',
    ' ',
    'g'
  )
);

CREATE INDEX "Post_structuredSearchText_trgm_idx"
ON "Post" USING GIN ("structuredSearchText" gin_trgm_ops);

CREATE INDEX "Post_structuredSearchText_tsv_idx"
ON "Post" USING GIN (to_tsvector('simple', COALESCE("structuredSearchText", '')));
