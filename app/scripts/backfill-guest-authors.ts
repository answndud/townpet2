import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BATCH_SIZE = (() => {
  const raw = Number(process.env.GUEST_AUTHOR_BACKFILL_BATCH_SIZE ?? "200");
  if (!Number.isFinite(raw) || raw <= 0) {
    return 200;
  }
  return Math.min(Math.floor(raw), 1000);
})();

const DRY_RUN = process.env.GUEST_AUTHOR_BACKFILL_DRY_RUN === "1";

type GuestMetaRecord = {
  id: string;
  guestDisplayName: string | null;
  guestPasswordHash: string | null;
  guestIpHash: string | null;
  guestFingerprintHash: string | null;
  guestIpDisplay: string | null;
  guestIpLabel: string | null;
};

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

function toGuestAuthorData(record: GuestMetaRecord) {
  if (!record.guestPasswordHash || !record.guestIpHash) {
    return null;
  }

  return {
    displayName: record.guestDisplayName?.trim() || "익명",
    passwordHash: record.guestPasswordHash,
    ipHash: record.guestIpHash,
    fingerprintHash: record.guestFingerprintHash,
    ipDisplay: record.guestIpDisplay,
    ipLabel: record.guestIpLabel,
  };
}

async function fetchLegacyBatch(table: "Post" | "Comment", cursor: string | null) {
  const sql = `
    SELECT
      id,
      "guestDisplayName",
      "guestPasswordHash",
      "guestIpHash",
      "guestFingerprintHash",
      "guestIpDisplay",
      "guestIpLabel"
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND "guestPasswordHash" IS NOT NULL
      AND "guestIpHash" IS NOT NULL
      ${cursor ? `AND id > $1` : ""}
    ORDER BY id ASC
    LIMIT ${BATCH_SIZE}
  `;

  const params = cursor ? [cursor] : [];
  return prisma.$queryRawUnsafe<GuestMetaRecord[]>(sql, ...params);
}

async function backfillPosts() {
  let cursor: string | null = null;
  let updated = 0;

  while (true) {
    const items = await fetchLegacyBatch("Post", cursor);
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const guestAuthorData = toGuestAuthorData(item);
      if (!guestAuthorData) {
        continue;
      }

      if (DRY_RUN) {
        updated += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const guestAuthor = await tx.guestAuthor.create({ data: guestAuthorData, select: { id: true } });
        await tx.post.update({ where: { id: item.id }, data: { guestAuthorId: guestAuthor.id } });
      });
      updated += 1;
    }

    cursor = items[items.length - 1]?.id ?? null;
  }

  return updated;
}

async function backfillComments() {
  let cursor: string | null = null;
  let updated = 0;

  while (true) {
    const items = await fetchLegacyBatch("Comment", cursor);
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const guestAuthorData = toGuestAuthorData(item);
      if (!guestAuthorData) {
        continue;
      }

      if (DRY_RUN) {
        updated += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const guestAuthor = await tx.guestAuthor.create({ data: guestAuthorData, select: { id: true } });
        await tx.comment.update({ where: { id: item.id }, data: { guestAuthorId: guestAuthor.id } });
      });
      updated += 1;
    }

    cursor = items[items.length - 1]?.id ?? null;
  }

  return updated;
}

async function main() {
  console.log(
    `Guest author backfill started (dryRun=${DRY_RUN ? "yes" : "no"}, batchSize=${BATCH_SIZE})`,
  );

  const hasLegacyPostColumns = await tableHasColumn("Post", "guestPasswordHash");
  const hasLegacyCommentColumns = await tableHasColumn("Comment", "guestPasswordHash");

  if (!hasLegacyPostColumns && !hasLegacyCommentColumns) {
    console.log("Legacy guest columns already dropped. Backfill skipped.");
    return;
  }

  const posts = hasLegacyPostColumns ? await backfillPosts() : 0;
  const comments = hasLegacyCommentColumns ? await backfillComments() : 0;

  if (DRY_RUN) {
    console.log(`Dry-run matched ${posts} posts and ${comments} comments for backfill.`);
    return;
  }

  console.log(`Backfilled guestAuthorId for ${posts} posts and ${comments} comments.`);
}

main()
  .catch((error) => {
    console.error("Guest author backfill failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
