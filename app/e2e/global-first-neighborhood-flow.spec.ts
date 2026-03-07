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
      nicknameUpdatedAt: null,
      bio: null,
      emailVerified: new Date(),
      passwordHash,
    },
    create: {
      email: testEmail,
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
    await expect(
      page.getByText("대표 동네를 설정해야 동네모임을 작성할 수 있습니다."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "프로필에서 동네 설정" })).toBeVisible();

    await page.goto("/profile");
    const firstCheckbox = page
      .locator('[data-testid^="profile-neighborhood-checkbox-"]')
      .first();
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
    await expect(
      page.getByText("병원후기는 온동네로 고정되고, 동네모임은 동네 범위로만 등록됩니다."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "프로필에서 동네 설정" })).toHaveCount(0);
  });
});
