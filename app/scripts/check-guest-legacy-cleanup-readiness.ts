import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const STRICT = process.env.GUEST_LEGACY_CLEANUP_STRICT === "1";

const LOOKBACK_HOURS = (() => {
  const raw = Number(process.env.GUEST_LEGACY_LOOKBACK_HOURS ?? "24");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 24;
  }
  return Math.min(Math.floor(raw), 24 * 30);
})();

async function tableHasColumn(table: "Post" | "Comment", column: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function countLegacyOnly(table: "Post" | "Comment") {
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND (
        "guestDisplayName" IS NOT NULL OR
        "guestIpDisplay" IS NOT NULL OR
        "guestIpLabel" IS NOT NULL OR
        "guestPasswordHash" IS NOT NULL OR
        "guestIpHash" IS NOT NULL OR
        "guestFingerprintHash" IS NOT NULL
      )
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function countRecentLegacyCredentialWrites(table: "Post" | "Comment", sinceIso: string) {
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "createdAt" >= $1::timestamptz
      AND "guestAuthorId" IS NULL
      AND (
        "guestPasswordHash" IS NOT NULL OR
        "guestIpHash" IS NOT NULL
      )
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql, sinceIso);
  return Number(rows[0]?.count ?? 0);
}

async function countPendingBackfill(table: "Post" | "Comment") {
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND "guestPasswordHash" IS NOT NULL
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const lookbackSince = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const [hasPostLegacy, hasCommentLegacy] = await Promise.all([
    tableHasColumn("Post", "guestPasswordHash"),
    tableHasColumn("Comment", "guestPasswordHash"),
  ]);

  if (!hasPostLegacy && !hasCommentLegacy) {
    const payload = {
      ok: true,
      strict: STRICT,
      lookbackHours: LOOKBACK_HOURS,
      postLegacyOnly: 0,
      commentLegacyOnly: 0,
      recentPostLegacyCredentialWrites: 0,
      recentCommentLegacyCredentialWrites: 0,
      pendingBackfillPosts: 0,
      pendingBackfillComments: 0,
      legacyColumnsPresent: false,
      skipped: "LEGACY_COLUMNS_ALREADY_DROPPED",
    };
    console.log(JSON.stringify(payload));
    return;
  }

  const [
    postLegacyOnly,
    commentLegacyOnly,
    recentPostLegacyCredentialWrites,
    recentCommentLegacyCredentialWrites,
    pendingBackfillPosts,
    pendingBackfillComments,
  ] = await Promise.all([
    hasPostLegacy ? countLegacyOnly("Post") : 0,
    hasCommentLegacy ? countLegacyOnly("Comment") : 0,
    hasPostLegacy ? countRecentLegacyCredentialWrites("Post", lookbackSince) : 0,
    hasCommentLegacy ? countRecentLegacyCredentialWrites("Comment", lookbackSince) : 0,
    hasPostLegacy ? countPendingBackfill("Post") : 0,
    hasCommentLegacy ? countPendingBackfill("Comment") : 0,
  ]);

  const ok =
    postLegacyOnly === 0 &&
    commentLegacyOnly === 0 &&
    recentPostLegacyCredentialWrites === 0 &&
    recentCommentLegacyCredentialWrites === 0 &&
    pendingBackfillPosts === 0 &&
    pendingBackfillComments === 0;

  const payload = {
    ok,
    strict: STRICT,
    lookbackHours: LOOKBACK_HOURS,
    postLegacyOnly,
    commentLegacyOnly,
    recentPostLegacyCredentialWrites,
    recentCommentLegacyCredentialWrites,
    pendingBackfillPosts,
    pendingBackfillComments,
    legacyColumnsPresent: true,
  };

  if (!ok && STRICT) {
    console.error(JSON.stringify(payload));
    process.exit(1);
  }

  const output = ok ? payload : { ...payload, warning: "READINESS_NOT_FULLY_GREEN" };
  if (ok) {
    console.log(JSON.stringify(output));
  } else {
    console.warn(JSON.stringify(output));
  }
}

main()
  .catch((error) => {
    console.error("Guest legacy cleanup readiness check failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
