DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Report"
    WHERE "targetType"::text <> 'POST'
  ) THEN
    RAISE EXCEPTION 'Cannot narrow ReportTarget enum because non-post report rows exist.';
  END IF;
END $$;

ALTER TYPE "ReportTarget" RENAME TO "ReportTarget_old";
CREATE TYPE "ReportTarget" AS ENUM ('POST');

ALTER TABLE "Report"
ALTER COLUMN "targetType" TYPE "ReportTarget"
USING ("targetType"::text::"ReportTarget");

DROP TYPE "ReportTarget_old";
