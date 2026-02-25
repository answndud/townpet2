import { expect, test } from "@playwright/test";
import { PostType, UserRole } from "@prisma/client";
import type { Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import {
  getGuestPostPolicy,
  setGuestPostPolicy,
} from "../src/server/queries/policy.queries";

const adminEmail = "admin.platform@townpet.dev";
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? "townpet123";

async function loginAsAdmin(page: Page) {
  await page.goto("/login?next=%2Fadmin%2Fpolicies");
  await page.getByTestId("login-email").fill(adminEmail);
  await page.getByTestId("login-password").fill(adminPassword);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/admin\/policies/, { timeout: 20_000 });
}

let originalPolicy: Awaited<ReturnType<typeof getGuestPostPolicy>> | null = null;

test.describe("admin guest post policy form", () => {
  test.beforeAll(async () => {
    originalPolicy = await getGuestPostPolicy();
  });

  test.beforeEach(async () => {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: UserRole.ADMIN,
        emailVerified: new Date(),
      },
      create: {
        email: adminEmail,
        role: UserRole.ADMIN,
        emailVerified: new Date(),
      },
    });

    const result = await setGuestPostPolicy({
      blockedPostTypes: [
        PostType.HOSPITAL_REVIEW,
        PostType.MARKET_LISTING,
        PostType.MEETUP,
        PostType.LOST_FOUND,
      ],
      maxImageCount: 1,
      allowLinks: false,
      allowContact: false,
      enforceGlobalScope: true,
      postRateLimit10m: 2,
      postRateLimit1h: 5,
      postRateLimit24h: 10,
      uploadRateLimit10m: 2,
      banThreshold24h: 3,
      banThreshold7dMedium: 5,
      banThreshold7dHigh: 8,
      banDurationHoursShort: 24,
      banDurationHoursMedium: 24 * 7,
      banDurationHoursLong: 24 * 30,
    });

    if (!result.ok) {
      throw new Error("Failed to set baseline guest post policy.");
    }
  });

  test.afterAll(async () => {
    if (!originalPolicy) {
      return;
    }
    await setGuestPostPolicy(originalPolicy);
  });

  test("updates rate/ban thresholds and persists after reload", async ({ page }) => {
    await loginAsAdmin(page);

    const postRate10m = page.getByTestId("guest-post-policy-rate-post-10m");
    const postRate24h = page.getByTestId("guest-post-policy-rate-post-24h");
    const banThreshold24h = page.getByTestId("guest-post-policy-threshold-24h");
    const banDurationLong = page.getByTestId("guest-post-policy-ban-long");
    const freeBoardBlocked = page.getByTestId("guest-post-policy-blocked-type-FREE_BOARD");

    await postRate10m.fill("3");
    await postRate24h.fill("11");
    await banThreshold24h.fill("4");
    await banDurationLong.fill("360");
    await freeBoardBlocked.check();
    await page.getByTestId("guest-post-policy-submit").click();

    await expect(page.getByTestId("guest-post-policy-success")).toContainText(
      "비회원 작성 정책이 저장되었습니다.",
    );

    await page.reload();

    await expect(postRate10m).toHaveValue("3");
    await expect(postRate24h).toHaveValue("11");
    await expect(banThreshold24h).toHaveValue("4");
    await expect(banDurationLong).toHaveValue("360");
    await expect(freeBoardBlocked).toBeChecked();
  });
});
