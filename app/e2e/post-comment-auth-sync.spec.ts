import { expect, test } from "@playwright/test";
import { PostScope, PostType } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { createPost } from "../src/server/services/post.service";
import {
  ensureCredentialUser,
  loginWithCredentials,
} from "./support/auth-helpers";

test.describe("post comment auth sync", () => {
  test("updates the comment composer across tabs when auth state changes", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const runId = `pw-comment-auth-${Date.now()}`;
    const email = `${runId}@townpet.dev`;
    const user = await ensureCredentialUser({
      email,
      nicknamePrefix: "e2e-comment-auth",
    });
    const community = await prisma.community.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    if (!community) {
      throw new Error("No active community found for comment auth sync setup.");
    }

    const post = await createPost({
      authorId: user.id,
      input: {
        title: `[PW COMMENT AUTH] ${runId}`,
        content: `Playwright comment auth sync setup ${runId}`,
        type: PostType.FREE_BOARD,
        scope: PostScope.GLOBAL,
        petTypeId: community.id,
        imageUrls: [],
      },
    });

    const context = await browser.newContext();
    const primaryPage = await context.newPage();
    const secondaryPage = await context.newPage();
    const commentBody = `Playwright comment auth sync ${runId}`;

    try {
      await loginWithCredentials(primaryPage, {
        email,
        next: "/feed",
      });

      await expect(
        primaryPage.locator('[data-testid="auth-logout-button"]:visible'),
      ).toBeVisible({
        timeout: 10_000,
      });
      await primaryPage.goto(`/posts/${post.id}`);
      await expect(primaryPage).toHaveURL(new RegExp(`/posts/${post.id}$`));
      await expect(primaryPage.getByTestId("post-comment-root-input")).toBeVisible();
      await expect(primaryPage.getByTestId("post-comment-guest-name")).toHaveCount(0);
      await expect(primaryPage.getByTestId("post-comment-guest-password")).toHaveCount(0);

      await secondaryPage.goto("/feed");
      await expect(
        secondaryPage.locator('[data-testid="auth-logout-button"]:visible'),
      ).toBeVisible();
      await secondaryPage.locator('[data-testid="auth-logout-button"]:visible').click();

      await expect(secondaryPage).toHaveURL(/\/login(?:\?.*)?$/);
      await expect(primaryPage.locator('[data-testid="header-login-link"]:visible')).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-name")).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-password")).toBeVisible();

      await loginWithCredentials(secondaryPage, {
        email,
        next: "/feed",
      });
      await expect(secondaryPage).toHaveURL(/\/feed(?:\?.*)?$/);
      await expect(
        primaryPage.locator('[data-testid="auth-logout-button"]:visible'),
      ).toBeVisible({
        timeout: 10_000,
      });

      await expect(primaryPage.getByTestId("post-comment-root-input")).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-name")).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-password")).toHaveCount(0, {
        timeout: 10_000,
      });

      await primaryPage.getByTestId("post-comment-root-input").fill(commentBody);
      await primaryPage.getByTestId("post-comment-root-submit").click();
      await expect(primaryPage.getByText(commentBody)).toBeVisible();
    } finally {
      await context.close();
      await prisma.$transaction(async (tx) => {
        await tx.notification.deleteMany({
          where: { postId: post.id },
        });
        await tx.comment.deleteMany({
          where: { postId: post.id },
        });
        await tx.post.deleteMany({
          where: { id: post.id },
        });
      });
    }
  });
});
