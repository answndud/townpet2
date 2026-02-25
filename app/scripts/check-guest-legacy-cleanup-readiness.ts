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

const legacyGuestColumnsFilter = {
  OR: [
    { guestDisplayName: { not: null as string | null } },
    { guestIpDisplay: { not: null as string | null } },
    { guestIpLabel: { not: null as string | null } },
    { guestPasswordHash: { not: null as string | null } },
    { guestIpHash: { not: null as string | null } },
    { guestFingerprintHash: { not: null as string | null } },
  ],
};

async function main() {
  const lookbackSince = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  const [
    postLegacyOnly,
    commentLegacyOnly,
    recentPostLegacyCredentialWrites,
    recentCommentLegacyCredentialWrites,
    pendingBackfillPosts,
    pendingBackfillComments,
  ] = await Promise.all([
    prisma.post.count({
      where: {
        guestAuthorId: null,
        ...legacyGuestColumnsFilter,
      },
    }),
    prisma.comment.count({
      where: {
        guestAuthorId: null,
        ...legacyGuestColumnsFilter,
      },
    }),
    prisma.post.count({
      where: {
        createdAt: { gte: lookbackSince },
        OR: [{ guestPasswordHash: { not: null } }, { guestIpHash: { not: null } }],
      },
    }),
    prisma.comment.count({
      where: {
        createdAt: { gte: lookbackSince },
        OR: [{ guestPasswordHash: { not: null } }, { guestIpHash: { not: null } }],
      },
    }),
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
