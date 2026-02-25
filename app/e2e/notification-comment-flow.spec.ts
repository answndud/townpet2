import { test, expect } from "@playwright/test";
import { PostScope, PostType, NotificationType } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { createComment } from "../src/server/services/comment.service";
import { listNotificationsByUser } from "../src/server/queries/notification.queries";
import { createPost } from "../src/server/services/post.service";

type SeededFlow = {
  runId: string;
  postId: string;
  commentId: string;
  notificationId: string;
  postTitle: string;
  recipientEmail: string;
};

const recipientEmail = process.env.E2E_RECIPIENT_EMAIL ?? "power.reviewer@townpet.dev";
const actorEmail = process.env.E2E_ACTOR_EMAIL ?? "mod.trust@townpet.dev";

let seeded: SeededFlow;

test.describe("notification comment flow", () => {
  test.beforeEach(async () => {
    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
      select: { id: true, email: true },
    });
    const actor = await prisma.user.findUnique({
      where: { email: actorEmail },
      select: { id: true, email: true },
    });

    if (!recipient) {
      throw new Error(`Recipient user not found: ${recipientEmail}`);
    }
    if (!actor) {
      throw new Error(`Actor user not found: ${actorEmail}`);
    }
    if (recipient.id === actor.id) {
      throw new Error("E2E users must be different.");
    }

    const defaultCommunity = await prisma.community.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (!defaultCommunity) {
      throw new Error("No active community found for notification flow setup.");
    }

    const runId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const postTitle = `[PW] notification ${runId}`;

    const post = await createPost({
      authorId: recipient.id,
      input: {
        title: postTitle,
        content: `Playwright notification setup ${runId}`,
        type: PostType.FREE_BOARD,
        scope: PostScope.GLOBAL,
        communityId: defaultCommunity.id,
        imageUrls: [],
      },
    });

    const comment = await createComment({
      authorId: actor.id,
      postId: post.id,
      input: {
        content: `Playwright comment ${runId}`,
      },
    });

    const notifications = await listNotificationsByUser({
      userId: recipient.id,
      limit: 20,
    });

    const target = notifications.items.find(
      (item) =>
        item.type === NotificationType.COMMENT_ON_POST &&
        item.postId === post.id &&
        item.commentId === comment.id,
    );

    if (!target) {
      throw new Error("Notification was not generated during setup.");
    }

    seeded = {
      runId,
      postId: post.id,
      commentId: comment.id,
      notificationId: target.id,
      postTitle,
      recipientEmail: recipient.email,
    };
  });

  test.afterEach(async () => {
    if (!seeded) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({
        where: {
          OR: [
            { id: seeded.notificationId },
            { commentId: seeded.commentId },
            { postId: seeded.postId },
          ],
        },
      });
      await tx.comment.deleteMany({ where: { id: seeded.commentId } });
      await tx.post.deleteMany({ where: { id: seeded.postId } });
    });
  });

  test("marks notification as read when moving to post", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/notifications/);

    const item = page.getByTestId(`notification-item-${seeded.notificationId}`);
    await expect(item).toContainText(seeded.runId);
    await expect(
      page.getByTestId(`notification-read-${seeded.notificationId}`),
    ).toBeVisible();

    await page.getByTestId(`notification-move-${seeded.notificationId}`).click();
    await expect(page).toHaveURL(new RegExp(`/posts/${seeded.postId}`));

    await page.goto("/notifications");
    const sameItem = page.getByTestId(`notification-item-${seeded.notificationId}`);
    await expect(
      page.getByTestId(`notification-read-${seeded.notificationId}`),
    ).toHaveCount(0);
    await expect(sameItem).toContainText(/읽음(?!\s*처리)/);
  });
});
