import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EXPECTED_ROLLBACK_ERROR = "GUEST_LEGACY_CLEANUP_REHEARSAL_ROLLBACK";

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

async function countPendingBackfill() {
  const [hasPostLegacy, hasCommentLegacy] = await Promise.all([
    tableHasColumn("Post", "guestPasswordHash"),
    tableHasColumn("Comment", "guestPasswordHash"),
  ]);

  if (!hasPostLegacy && !hasCommentLegacy) {
    return { postRemaining: 0, commentRemaining: 0 };
  }

  const [postRemainingRows, commentRemainingRows] = await Promise.all([
    hasPostLegacy
      ? prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count
          FROM "Post"
          WHERE "guestAuthorId" IS NULL
            AND "guestPasswordHash" IS NOT NULL
        `
      : Promise.resolve([{ count: 0 }]),
    hasCommentLegacy
      ? prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count
          FROM "Comment"
          WHERE "guestAuthorId" IS NULL
            AND "guestPasswordHash" IS NOT NULL
        `
      : Promise.resolve([{ count: 0 }]),
  ]);

  const postRemaining = Number(postRemainingRows[0]?.count ?? 0);
  const commentRemaining = Number(commentRemainingRows[0]?.count ?? 0);

  return { postRemaining, commentRemaining };
}

async function assertLegacyColumnsExist(table: "Post" | "Comment", columns: string[]) {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name IN (${Prisma.join(columns)})
  `;

  const existing = new Set(rows.map((row) => row.column_name));
  const missing = columns.filter((column) => !existing.has(column));
  return missing;
}

async function rehearsalDropInRollbackTransaction() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestDisplayName"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestIpDisplay"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestIpLabel"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestPasswordHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestIpHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Post" DROP COLUMN "guestFingerprintHash"');

    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestDisplayName"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestIpDisplay"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestIpLabel"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestPasswordHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestIpHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "Comment" DROP COLUMN "guestFingerprintHash"');

    throw new Error(EXPECTED_ROLLBACK_ERROR);
  });
}

async function main() {
  const pending = await countPendingBackfill();
  if (pending.postRemaining > 0 || pending.commentRemaining > 0) {
    console.error(
      JSON.stringify({
        ok: false,
        reason: "BACKFILL_INCOMPLETE",
        ...pending,
      }),
    );
    process.exit(1);
  }

  const legacyColumns = [
    "guestDisplayName",
    "guestIpDisplay",
    "guestIpLabel",
    "guestPasswordHash",
    "guestIpHash",
    "guestFingerprintHash",
  ];

  const [missingPostColumns, missingCommentColumns] = await Promise.all([
    assertLegacyColumnsExist("Post", legacyColumns),
    assertLegacyColumnsExist("Comment", legacyColumns),
  ]);

  if (missingPostColumns.length > 0 || missingCommentColumns.length > 0) {
    console.log(
      JSON.stringify({
        ok: true,
        rehearsal: "drop-legacy-guest-columns",
        rollback: true,
        skipped: "LEGACY_COLUMNS_ALREADY_DROPPED",
      }),
    );
    return;
  }

  try {
    await rehearsalDropInRollbackTransaction();
    console.error(JSON.stringify({ ok: false, reason: "REHEARSAL_DID_NOT_ROLLBACK" }));
    process.exit(1);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== EXPECTED_ROLLBACK_ERROR) {
      throw error;
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      rehearsal: "drop-legacy-guest-columns",
      rollback: true,
    }),
  );
}

main()
  .catch((error) => {
    console.error("Guest legacy cleanup rehearsal failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
