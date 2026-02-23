import { expect, test } from "@playwright/test";

test.describe("naver login entry", () => {
  test("shows naver button and starts naver sign-in request", async ({ page }) => {
    await page.goto("/login?next=%2Fonboarding&devShowNaver=1");
    const naverButton = page.getByRole("button", { name: "네이버로 로그인" });
    await expect(naverButton).toBeVisible();

    const naverSignInRequest = page.waitForRequest((request) => {
      return (
        (request.url().includes("/api/auth/signin/naver") ||
          request.url().includes("/api/auth/callback/social-dev")) &&
        (request.method() === "POST" || request.method() === "GET")
      );
    });
    await naverButton.click();

    const request = await naverSignInRequest;
    expect(request.url()).toMatch(
      /\/api\/auth\/(signin\/naver|callback\/social-dev)/,
    );
  });

  test("shows naver button on register page with dev flag", async ({ page }) => {
    await page.goto("/register?devShowNaver=1");
    await expect(
      page.getByRole("button", { name: "네이버로 가입" }),
    ).toBeVisible();
  });
});
