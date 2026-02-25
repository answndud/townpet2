import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EXPECTED_ROLLBACK_ERROR = "GUEST_LEGACY_CLEANUP_REHEARSAL_ROLLBACK";

async function countPendingBackfill() {
  const [postRemaining, commentRemaining] = await Promise.all([
    prisma.post.count({
      where: {
        guestPasswordHash: { not: null },
        guestAuthorId: null,
      },
    }),
    prisma.comment.count({
      where: {
        guestPasswordHash: { not: null },
        guestAuthorId: null,
      },
    }),
  ]);

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
  if (missing.length > 0) {
    throw new Error(`${table} missing legacy columns: ${missing.join(", ")}`);
  }
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

  await assertLegacyColumnsExist("Post", legacyColumns);
  await assertLegacyColumnsExist("Comment", legacyColumns);

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
