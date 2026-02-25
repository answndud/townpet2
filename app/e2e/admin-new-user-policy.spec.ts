import { expect, test } from "@playwright/test";
import { PostType, UserRole } from "@prisma/client";
import type { Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import {
  getNewUserSafetyPolicy,
  setNewUserSafetyPolicy,
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

let originalPolicy: Awaited<ReturnType<typeof getNewUserSafetyPolicy>> | null = null;

test.describe("admin new-user safety policy form", () => {
  test.beforeAll(async () => {
    originalPolicy = await getNewUserSafetyPolicy();
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

    const result = await setNewUserSafetyPolicy({
      minAccountAgeHours: 24,
      restrictedPostTypes: [
        PostType.MARKET_LISTING,
        PostType.LOST_FOUND,
        PostType.MEETUP,
      ],
      contactBlockWindowHours: 24,
    });

    if (!result.ok) {
      throw new Error("Failed to set baseline new-user safety policy.");
    }
  });

  test.afterAll(async () => {
    if (!originalPolicy) {
      return;
    }
    await setNewUserSafetyPolicy(originalPolicy);
  });

  test("updates policy values and persists after reload", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByRole("heading", { name: "열람/콘텐츠 정책" })).toBeVisible();

    const minAgeInput = page.getByTestId("new-user-policy-min-account-age-hours");
    const contactWindowInput = page.getByTestId(
      "new-user-policy-contact-block-window-hours",
    );
    const freePostCheckbox = page.getByTestId("new-user-policy-post-type-FREE_POST");

    await minAgeInput.fill("12");
    await contactWindowInput.fill("6");
    await freePostCheckbox.check();
    await page.getByTestId("new-user-policy-submit").click();

    await expect(page.getByTestId("new-user-policy-success")).toContainText(
      "신규 계정 안전 정책이 저장되었습니다.",
    );

    await page.reload();

    await expect(minAgeInput).toHaveValue("12");
    await expect(contactWindowInput).toHaveValue("6");
    await expect(freePostCheckbox).toBeChecked();
  });
});
