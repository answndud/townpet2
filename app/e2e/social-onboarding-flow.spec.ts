import { expect, test } from "@playwright/test";

import { prisma } from "../src/lib/prisma";

type SocialScenario = {
  provider: "kakao" | "naver";
  loginQueryParam: string;
  buttonLabel: string;
  emailEnvKey: "E2E_SOCIAL_KAKAO_EMAIL" | "E2E_SOCIAL_NAVER_EMAIL";
  fallbackEmail: string;
};

const scenarios: SocialScenario[] = [
  {
    provider: "kakao",
    loginQueryParam: "devShowKakao=1",
    buttonLabel: "카카오로 1초 로그인",
    emailEnvKey: "E2E_SOCIAL_KAKAO_EMAIL",
    fallbackEmail: "e2e.kakao@townpet.dev",
  },
  {
    provider: "naver",
    loginQueryParam: "devShowNaver=1",
    buttonLabel: "네이버로 1초 로그인",
    emailEnvKey: "E2E_SOCIAL_NAVER_EMAIL",
    fallbackEmail: "e2e.naver@townpet.dev",
  },
];

async function resetOnboardingState(email: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      nickname: null,
      bio: null,
      emailVerified: new Date(),
    },
    create: {
      email,
      name: "E2E Social User",
      emailVerified: new Date(),
    },
    select: { id: true },
  });

  await prisma.userNeighborhood.deleteMany({
    where: { userId: user.id },
  });
}

for (const scenario of scenarios) {
  test.describe(`social onboarding flow (${scenario.provider})`, () => {
    test.beforeEach(async () => {
      const email = process.env[scenario.emailEnvKey] ?? scenario.fallbackEmail;
      await resetOnboardingState(email);
    });

    test("logs in and completes onboarding", async ({ page }) => {
      await page.goto(`/login?next=%2Fonboarding&${scenario.loginQueryParam}`);
      await page.getByRole("button", { name: scenario.buttonLabel }).click();

      await expect(page).toHaveURL(/\/onboarding/);

      const nickname = `pw-${scenario.provider}-${Date.now().toString().slice(-6)}`;
      await page.getByTestId("onboarding-nickname").fill(nickname);
      await page.getByTestId("onboarding-profile-submit").click();
      await expect(page.getByText("프로필이 저장되었습니다.")).toBeVisible();

      const neighborhoodValues = await page
        .getByTestId("onboarding-neighborhood")
        .locator("option")
        .evaluateAll((options) =>
          options
            .map((option) => (option as HTMLOptionElement).value)
            .filter((value) => value.length > 0),
        );
      expect(neighborhoodValues.length).toBeGreaterThan(0);

      await page
        .getByTestId("onboarding-neighborhood")
        .selectOption(neighborhoodValues[0] ?? "");
      await page.getByTestId("onboarding-neighborhood-submit").click();

      await expect(page).toHaveURL(/\/feed(?:\?.*)?$/);
      await expect(page.getByTestId("feed-post-list")).toBeVisible();
    });
  });
}
