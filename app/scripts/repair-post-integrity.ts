import "dotenv/config";

import { PostStatus } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  bumpFeedCacheVersion,
  bumpNotificationListCacheVersion,
  bumpNotificationUnreadCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "../src/server/cache/query-cache";
import {
  archiveInvalidNotificationTargets,
  recountPostEngagementCounts,
  repairDeletedPostIntegrity,
} from "../src/server/post-integrity.service";

function parseOptionalPositiveInteger(
  rawValue: string | undefined,
  envName: string,
): number | undefined {
  if (!rawValue || rawValue.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive number when provided.`);
  }

  return Math.floor(parsed);
}

function parseRepairScope(rawValue: string | undefined): PostStatus | "ALL" {
  const normalized = rawValue?.trim().toUpperCase();
  if (!normalized || normalized === "ALL") {
    return "ALL";
  }

  if (normalized === PostStatus.ACTIVE) {
    return PostStatus.ACTIVE;
  }
  if (normalized === PostStatus.HIDDEN) {
    return PostStatus.HIDDEN;
  }
  if (normalized === PostStatus.DELETED) {
    return PostStatus.DELETED;
  }

  throw new Error("POST_COUNT_REPAIR_SCOPE must be one of ALL, ACTIVE, HIDDEN, DELETED.");
}

async function bumpPresentationCaches() {
  await Promise.all([
    bumpFeedCacheVersion(),
    bumpSearchCacheVersion(),
    bumpSuggestCacheVersion(),
    bumpPostDetailCacheVersion(),
    bumpPostCommentsCacheVersion(),
  ]);
}

async function bumpNotificationCaches(userIds: string[]) {
  const dedupedUserIds = Array.from(new Set(userIds.filter((value) => value.trim().length > 0)));
  await Promise.all(
    dedupedUserIds.flatMap((userId) => [
      bumpNotificationUnreadCacheVersion(userId),
      bumpNotificationListCacheVersion(userId),
    ]),
  );
}

async function main() {
  const dryRun = process.env.POST_INTEGRITY_REPAIR_DRY_RUN === "1";
  const deletedPostLimit = parseOptionalPositiveInteger(
    process.env.POST_INTEGRITY_DELETED_POST_LIMIT,
    "POST_INTEGRITY_DELETED_POST_LIMIT",
  );
  const notificationLimit = parseOptionalPositiveInteger(
    process.env.POST_INTEGRITY_NOTIFICATION_LIMIT,
    "POST_INTEGRITY_NOTIFICATION_LIMIT",
  );
  const recountLimit = parseOptionalPositiveInteger(
    process.env.POST_COUNT_REPAIR_LIMIT,
    "POST_COUNT_REPAIR_LIMIT",
  );
  const recountScope = parseRepairScope(process.env.POST_COUNT_REPAIR_SCOPE);

  const deletedPostRepair = await repairDeletedPostIntegrity({
    dryRun,
    limit: deletedPostLimit,
  });
  const invalidNotificationRepair = await archiveInvalidNotificationTargets({
    dryRun,
    limit: notificationLimit,
  });
  const countRecount = await recountPostEngagementCounts({
    dryRun,
    limit: recountLimit,
    scope: recountScope,
  });

  if (!dryRun) {
    await bumpPresentationCaches();
    await bumpNotificationCaches([
      ...deletedPostRepair.affectedNotificationUserIds,
      ...invalidNotificationRepair.affectedUserIds,
    ]);
  }

  console.log("Post integrity repair");
  console.log(`- dryRun: ${dryRun ? "yes" : "no"}`);
  console.log(`- deletedPosts.scanned: ${deletedPostRepair.scannedPosts}`);
  console.log(`- deletedPosts.repaired: ${deletedPostRepair.repairedPosts}`);
  console.log(
    `- deletedPosts.activeCommentsSoftDeleted: ${deletedPostRepair.activeCommentsSoftDeleted}`,
  );
  console.log(
    `- deletedPosts.commentReactionsRemoved: ${deletedPostRepair.commentReactionsRemoved}`,
  );
  console.log(`- deletedPosts.postReactionsRemoved: ${deletedPostRepair.postReactionsRemoved}`);
  console.log(`- deletedPosts.bookmarksRemoved: ${deletedPostRepair.bookmarksRemoved}`);
  console.log(`- deletedPosts.notificationsArchived: ${deletedPostRepair.notificationsArchived}`);
  console.log(
    `- invalidNotifications.scanned: ${invalidNotificationRepair.scannedNotifications}`,
  );
  console.log(
    `- invalidNotifications.archived: ${invalidNotificationRepair.archivedNotifications}`,
  );
  console.log(`- recount.scope: ${recountScope}`);
  console.log(`- recount.scannedPosts: ${countRecount.scannedPosts}`);
  console.log(`- recount.updatedPosts: ${countRecount.updatedPosts}`);
  console.log(`- recount.unchangedPosts: ${countRecount.unchangedPosts}`);
  console.log(`- recount.updatedCommentCounts: ${countRecount.updatedCommentCounts}`);
  console.log(`- recount.updatedLikeCounts: ${countRecount.updatedLikeCounts}`);
  console.log(`- recount.updatedDislikeCounts: ${countRecount.updatedDislikeCounts}`);
}

main()
  .catch((error) => {
    console.error("Post integrity repair failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
