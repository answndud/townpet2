import { expect, test } from "@playwright/test";

test.describe("kakao login entry", () => {
  test("shows kakao button and starts kakao sign-in request", async ({ page }) => {
    await page.goto("/login?next=%2Fonboarding&devShowKakao=1");
    const kakaoButton = page.getByRole("button", { name: "카카오로 1초 로그인" });
    await expect(kakaoButton).toBeVisible();

    const kakaoSignInRequest = page.waitForRequest((request) => {
      return (
        (request.url().includes("/api/auth/signin/kakao") ||
          request.url().includes("/api/auth/callback/social-dev")) &&
        (request.method() === "POST" || request.method() === "GET")
      );
    });
    await kakaoButton.click();

    const request = await kakaoSignInRequest;
    expect(request.url()).toMatch(
      /\/api\/auth\/(signin\/kakao|callback\/social-dev)/,
    );
  });

  test("shows kakao button on register page with dev flag", async ({ page }) => {
    await page.goto("/register?devShowKakao=1");
    await expect(
      page.getByRole("button", { name: "카카오로 빠르게 가입" }),
    ).toBeVisible();
  });
});
