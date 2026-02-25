import { expect, test } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/server/password";

const testEmail = "e2e.global-first@townpet.dev";
const testPassword = "Password123!";

async function resetUserNeighborhoodState() {
  const passwordHash = await hashPassword(testPassword);
  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      nickname: `gf-${Date.now().toString().slice(-6)}`,
      bio: null,
      emailVerified: new Date(),
      passwordHash,
    },
    create: {
      email: testEmail,
      name: "E2E Global First User",
      nickname: `gf-${Date.now().toString().slice(-6)}`,
      emailVerified: new Date(),
      passwordHash,
    },
    select: { id: true },
  });

  await prisma.userNeighborhood.deleteMany({ where: { userId: user.id } });
}

test.describe("global first neighborhood flow", () => {
  test.beforeEach(async () => {
    await resetUserNeighborhoodState();
  });

  test("allows global post first, then enables local after neighborhood set", async ({ page }) => {
    await page.goto("/login?next=%2Fposts%2Fnew");
    await page.getByTestId("login-email").fill(testEmail);
    await page.getByTestId("login-password").fill(testPassword);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/posts\/new/);
    await expect(page.getByText("지금은 온동네 글만 작성할 수 있습니다.")).toBeVisible();

    const scopeSelect = page.locator("label:has-text('범위') select");
    await expect(scopeSelect).toBeVisible();
    const localDisabled = await scopeSelect.locator('option[value="LOCAL"]').evaluate((node) => {
      return (node as HTMLOptionElement).disabled;
    });
    expect(localDisabled).toBe(true);

    await page.goto("/profile");
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 10_000 });
    await firstCheckbox.check();

    const firstPrimaryOptionValue = await page
      .locator("label:has-text('대표 동네') select option")
      .nth(1)
      .getAttribute("value");
    await page
      .locator("label:has-text('대표 동네') select")
      .selectOption(firstPrimaryOptionValue ?? "");

    await page.getByRole("button", { name: "동네 저장" }).click();
    await expect(page.getByText("내 동네가 저장되었습니다.")).toBeVisible();

    await page.goto("/posts/new");
    const localDisabledAfter = await scopeSelect
      .locator('option[value="LOCAL"]')
      .evaluate((node) => (node as HTMLOptionElement).disabled);
    expect(localDisabledAfter).toBe(false);
  });
});
