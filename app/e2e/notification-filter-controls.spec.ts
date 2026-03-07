import { expect, test, type Page } from "@playwright/test";
import {
  NotificationEntityType,
  NotificationType,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/server/password";

const recipientEmail = process.env.E2E_RECIPIENT_EMAIL ?? "power.reviewer@townpet.dev";
const actorEmail = process.env.E2E_ACTOR_EMAIL ?? "mod.trust@townpet.dev";
const recipientPassword =
  process.env.E2E_RECIPIENT_PASSWORD ??
  process.env.E2E_LOGIN_PASSWORD ??
  process.env.SEED_DEFAULT_PASSWORD ??
  "dev-password-1234";

let createdNotificationIds: string[] = [];
let runId = "";
let unreadSystemId = "";

async function loginAsRecipient(page: Page) {
  await page.goto("/login?next=%2Fnotifications");
  await page.getByTestId("login-email").fill(recipientEmail);
  await page.getByTestId("login-password").fill(recipientPassword);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/notifications/, { timeout: 20_000 });
}

test.describe("notification filter controls", () => {
  test.beforeEach(async () => {
    const [recipient, actor] = await Promise.all([
      prisma.user.findUnique({
        where: { email: recipientEmail },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email: actorEmail },
        select: { id: true },
      }),
    ]);

    if (!recipient) {
      throw new Error(`Recipient user not found: ${recipientEmail}`);
    }
    if (!actor) {
      throw new Error(`Actor user not found: ${actorEmail}`);
    }

    await prisma.user.update({
      where: { id: recipient.id },
      data: {
        emailVerified: new Date(),
        passwordHash: await hashPassword(recipientPassword),
      },
    });

    runId = `pw-noti-filter-${Date.now().toString(36)}`;
    createdNotificationIds = [];

    const unreadComment = await prisma.notification.create({
      data: {
        userId: recipient.id,
        actorId: actor.id,
        type: NotificationType.COMMENT_ON_POST,
        entityType: NotificationEntityType.COMMENT,
        entityId: `${runId}-comment`,
        title: `[${runId}] 댓글 알림`,
      },
      select: { id: true },
    });
    createdNotificationIds.push(unreadComment.id);

    const unreadReaction = await prisma.notification.create({
      data: {
        userId: recipient.id,
        actorId: actor.id,
        type: NotificationType.REACTION_ON_POST,
        entityType: NotificationEntityType.REACTION,
        entityId: `${runId}-reaction-unread`,
        title: `[${runId}] 반응 알림(미확인)`,
      },
      select: { id: true },
    });
    createdNotificationIds.push(unreadReaction.id);

    const readReaction = await prisma.notification.create({
      data: {
        userId: recipient.id,
        actorId: actor.id,
        type: NotificationType.REACTION_ON_POST,
        entityType: NotificationEntityType.REACTION,
        entityId: `${runId}-reaction-read`,
        title: `[${runId}] 반응 알림(읽음)`,
        isRead: true,
        readAt: new Date(),
      },
      select: { id: true },
    });
    createdNotificationIds.push(readReaction.id);

    const unreadSystem = await prisma.notification.create({
      data: {
        userId: recipient.id,
        actorId: actor.id,
        type: NotificationType.SYSTEM,
        entityType: NotificationEntityType.SYSTEM,
        entityId: `${runId}-system`,
        title: `[${runId}] 시스템 알림`,
      },
      select: { id: true },
    });
    createdNotificationIds.push(unreadSystem.id);
    unreadSystemId = unreadSystem.id;
  });

  test.afterEach(async () => {
    if (createdNotificationIds.length === 0) {
      return;
    }

    await prisma.notification.deleteMany({
      where: {
        id: { in: createdNotificationIds },
      },
    });
  });

  test("applies kind tabs and unread-only toggle with URL sync", async ({ page }) => {
    await loginAsRecipient(page);

    await expect(page.getByText(`[${runId}] 댓글 알림`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 반응 알림(미확인)`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 반응 알림(읽음)`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 시스템 알림`)).toBeVisible();

    await page.getByRole("button", { name: "댓글/답글", exact: true }).click();
    await expect(page).toHaveURL(/\/notifications\?kind=COMMENT/);
    await expect(page.getByText(`[${runId}] 댓글 알림`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 반응 알림(미확인)`)).toHaveCount(0);
    await expect(page.getByText(`[${runId}] 시스템 알림`)).toHaveCount(0);

    await page.getByRole("button", { name: "반응", exact: true }).click();
    await expect(page).toHaveURL(/\/notifications\?kind=REACTION/);
    await expect(page.getByText(`[${runId}] 반응 알림(미확인)`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 반응 알림(읽음)`)).toBeVisible();

    await page.getByRole("button", { name: "읽지 않음만", exact: true }).click();
    await expect(page).toHaveURL(/\/notifications\?kind=REACTION&unreadOnly=1/);
    await expect(page.getByText(`[${runId}] 반응 알림(미확인)`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 반응 알림(읽음)`)).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/notifications\?kind=REACTION&unreadOnly=1/);
    await expect(page.getByText(`[${runId}] 반응 알림(미확인)`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 반응 알림(읽음)`)).toHaveCount(0);

    await page.getByRole("button", { name: "전체", exact: true }).click();
    await expect(page).toHaveURL(/\/notifications\?unreadOnly=1/);
    await expect(page.getByText(`[${runId}] 댓글 알림`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 시스템 알림`)).toBeVisible();
    await expect(page.getByText(`[${runId}] 반응 알림(읽음)`)).toHaveCount(0);
  });

  test("dismisses notification with X button", async ({ page }) => {
    await loginAsRecipient(page);
    await page.getByRole("button", { name: "시스템", exact: true }).click();
    await expect(page).toHaveURL(/\/notifications\?kind=SYSTEM/);

    const item = page.getByTestId(`notification-item-${unreadSystemId}`);
    await expect(item).toContainText(`[${runId}] 시스템 알림`);
    await page.getByTestId(`notification-dismiss-${unreadSystemId}`).click();
    await expect(page.getByTestId(`notification-item-${unreadSystemId}`)).toHaveCount(0);
  });
});
