import { expect, test } from "@playwright/test";
import { SanctionLevel } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  buildCookieHeader,
  ensureCredentialUser,
  ensureModeratorUser,
  loginWithCredentialsApi,
  loginWithCredentials,
} from "./support/auth-helpers";

test.describe("auth session hardening", () => {
  test("normalizes credentials email input, syncs tabs, and revokes stale session cookies", async ({
    browser,
    request,
  }) => {
    test.setTimeout(60_000);
    const runId = `pw-auth-case-${Date.now()}`;
    const email = `${runId}@townpet.dev`;
    await ensureCredentialUser({
      email,
      nicknamePrefix: "e2e-auth-case",
    });

    const context = await browser.newContext();
    const primaryPage = await context.newPage();
    const secondaryPage = await context.newPage();

    await Promise.all([primaryPage.goto("/feed"), secondaryPage.goto("/feed")]);
    await expect(primaryPage.getByTestId("header-login-link")).toBeVisible();
    await expect(secondaryPage.getByTestId("header-login-link")).toBeVisible();

    await loginWithCredentialsApi(primaryPage, {
      email: email.toUpperCase(),
      next: "/feed",
    });

    await secondaryPage.goto("/feed");
    await expect(primaryPage.locator('[data-testid="auth-logout-button"]:visible')).toBeVisible();
    await expect(secondaryPage.locator('[data-testid="auth-logout-button"]:visible')).toBeVisible({
      timeout: 10_000,
    });

    const staleCookieHeader = await buildCookieHeader(context);
    expect(staleCookieHeader).toContain("townpet.session-token=");

    await primaryPage.locator('[data-testid="auth-logout-button"]:visible').click();

    await expect(primaryPage).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(secondaryPage.getByTestId("header-login-link")).toBeVisible({
      timeout: 10_000,
    });

    const staleSessionResponse = await request.get("/api/viewer-shell", {
      headers: {
        cookie: staleCookieHeader,
      },
    });
    expect(staleSessionResponse.ok()).toBe(true);
    const staleSessionPayload = (await staleSessionResponse.json()) as {
      ok: boolean;
      data: {
        isAuthenticated: boolean;
        canModerate: boolean;
        unreadNotificationCount: number;
        preferredPetTypeIds: string[];
      };
    };
    expect(staleSessionPayload).toMatchObject({
      ok: true,
      data: {
        isAuthenticated: false,
        canModerate: false,
        unreadNotificationCount: 0,
        preferredPetTypeIds: [],
      },
    });

    await context.close();
  });

  test("blocks suspended users from credentials login", async ({ page }) => {
    test.setTimeout(60_000);
    const runId = `pw-auth-suspended-${Date.now()}`;
    const email = `${runId}@townpet.dev`;
    const moderatorEmail = `${runId}-moderator@townpet.dev`;

    const [user, moderator] = await Promise.all([
      ensureCredentialUser({
        email,
        nicknamePrefix: "e2e-suspended-user",
      }),
      ensureModeratorUser({
        email: moderatorEmail,
        nicknamePrefix: "e2e-suspended-admin",
      }),
    ]);

    await prisma.userSanction.deleteMany({
      where: {
        userId: user.id,
      },
    });
    await prisma.userSanction.create({
      data: {
        userId: user.id,
        moderatorId: moderator.id,
        level: SanctionLevel.SUSPEND_7D,
        reason: "Playwright suspended login verification",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await loginWithCredentials(page, {
      email,
      next: "/feed",
    });

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(
      page.getByText("로그인에 실패했습니다. 입력 정보를 확인하고 다시 시도해 주세요."),
    ).toBeVisible();
  });
});
