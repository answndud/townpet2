import { expect, test } from "@playwright/test";

const runRealOAuth = process.env.E2E_REAL_SOCIAL_OAUTH === "1";

test.describe("social real oauth redirect", () => {
  test.skip(
    !runRealOAuth,
    "E2E_REAL_SOCIAL_OAUTH=1 일 때만 실OAuth 리다이렉트 스모크를 실행합니다.",
  );

  test("kakao button redirects to kakao oauth host", async ({ page }) => {
    await page.goto("/login?next=%2Fonboarding");
    const kakaoButton = page.getByRole("button", { name: "카카오로 로그인" });
    await expect(kakaoButton).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => url.hostname.includes("kakao.com"), {
        timeout: 20_000,
      }),
      kakaoButton.click(),
    ]);
  });

  test("naver button redirects to naver oauth host", async ({ page }) => {
    await page.goto("/login?next=%2Fonboarding");
    const naverButton = page.getByRole("button", { name: "네이버로 로그인" });
    await expect(naverButton).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => url.hostname.includes("naver.com"), {
        timeout: 20_000,
      }),
      naverButton.click(),
    ]);
  });
});
