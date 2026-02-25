-- DropIndex
DROP INDEX IF EXISTS "Post_guestIpHash_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Post_guestFingerprintHash_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Comment_guestIpHash_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Comment_guestFingerprintHash_createdAt_idx";

-- AlterTable
ALTER TABLE "Post"
  DROP COLUMN IF EXISTS "guestDisplayName",
  DROP COLUMN IF EXISTS "guestIpDisplay",
  DROP COLUMN IF EXISTS "guestIpLabel",
  DROP COLUMN IF EXISTS "guestPasswordHash",
  DROP COLUMN IF EXISTS "guestIpHash",
  DROP COLUMN IF EXISTS "guestFingerprintHash";

-- AlterTable
ALTER TABLE "Comment"
  DROP COLUMN IF EXISTS "guestDisplayName",
  DROP COLUMN IF EXISTS "guestIpDisplay",
  DROP COLUMN IF EXISTS "guestIpLabel",
  DROP COLUMN IF EXISTS "guestPasswordHash",
  DROP COLUMN IF EXISTS "guestIpHash",
  DROP COLUMN IF EXISTS "guestFingerprintHash";
