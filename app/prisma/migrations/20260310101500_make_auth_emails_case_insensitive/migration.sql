CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY lower(trim("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot convert User.email to CITEXT because duplicate normalized emails exist';
  END IF;
END
$$;

UPDATE "User"
SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"));

UPDATE "VerificationToken"
SET "identifier" = lower(trim("identifier"))
WHERE "identifier" <> lower(trim("identifier"));

ALTER TABLE "User"
ALTER COLUMN "email" TYPE CITEXT USING lower(trim("email"));

ALTER TABLE "VerificationToken"
ALTER COLUMN "identifier" TYPE CITEXT USING lower(trim("identifier"));
