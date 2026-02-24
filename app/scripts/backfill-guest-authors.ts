import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BATCH_SIZE = 200;

type GuestMetaRecord = {
  id: string;
  guestAuthorId: string | null;
  guestDisplayName: string | null;
  guestPasswordHash: string | null;
  guestIpHash: string | null;
  guestFingerprintHash: string | null;
  guestIpDisplay: string | null;
  guestIpLabel: string | null;
};

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

async function backfillPosts() {
  let cursor: string | null = null;
  let updated = 0;

  while (true) {
    const items: GuestMetaRecord[] = (await prisma.post.findMany({
      where: {
        guestAuthorId: null,
        guestPasswordHash: { not: null },
        guestIpHash: { not: null },
      },
      select: {
        id: true,
        guestAuthorId: true,
        guestDisplayName: true,
        guestPasswordHash: true,
        guestIpHash: true,
        guestFingerprintHash: true,
        guestIpDisplay: true,
        guestIpLabel: true,
      },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    })) as GuestMetaRecord[];

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const guestAuthorData = toGuestAuthorData(item);
      if (!guestAuthorData) {
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const guestAuthor = await tx.guestAuthor.create({ data: guestAuthorData, select: { id: true } });
        await tx.post.update({
          where: { id: item.id },
          data: { guestAuthorId: guestAuthor.id },
        });
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
    const items: GuestMetaRecord[] = (await prisma.comment.findMany({
      where: {
        guestAuthorId: null,
        guestPasswordHash: { not: null },
        guestIpHash: { not: null },
      },
      select: {
        id: true,
        guestAuthorId: true,
        guestDisplayName: true,
        guestPasswordHash: true,
        guestIpHash: true,
        guestFingerprintHash: true,
        guestIpDisplay: true,
        guestIpLabel: true,
      },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    })) as GuestMetaRecord[];

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const guestAuthorData = toGuestAuthorData(item);
      if (!guestAuthorData) {
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const guestAuthor = await tx.guestAuthor.create({ data: guestAuthorData, select: { id: true } });
        await tx.comment.update({
          where: { id: item.id },
          data: { guestAuthorId: guestAuthor.id },
        });
      });
      updated += 1;
    }

    cursor = items[items.length - 1]?.id ?? null;
  }

  return updated;
}

async function main() {
  const posts = await backfillPosts();
  const comments = await backfillComments();

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
