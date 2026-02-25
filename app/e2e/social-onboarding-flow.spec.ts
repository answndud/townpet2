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
    buttonLabel: "카카오로 로그인",
    emailEnvKey: "E2E_SOCIAL_KAKAO_EMAIL",
    fallbackEmail: "e2e.kakao@townpet.dev",
  },
  {
    provider: "naver",
    loginQueryParam: "devShowNaver=1",
    buttonLabel: "네이버로 로그인",
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

async function ensureNeighborhoodExists() {
  const existing = await prisma.neighborhood.findFirst({
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const created = await prisma.neighborhood.create({
    data: {
      city: "서울시",
      district: "강남구",
      name: "역삼동",
    },
    select: { id: true },
  });

  return created.id;
}

for (const scenario of scenarios) {
  test.describe(`social onboarding flow (${scenario.provider})`, () => {
    test.beforeEach(async () => {
      const email = process.env[scenario.emailEnvKey] ?? scenario.fallbackEmail;
      await resetOnboardingState(email);
      await ensureNeighborhoodExists();
    });

    test("logs in and completes onboarding", async ({ page }) => {
      await page.goto(`/login?next=%2Fonboarding&${scenario.loginQueryParam}`);
      await page.getByRole("button", { name: scenario.buttonLabel }).click();

      await expect(page).toHaveURL(/\/onboarding/);

      const nickname = `pw-${scenario.provider}-${Date.now().toString().slice(-6)}`;
      await page.getByTestId("onboarding-nickname").fill(nickname);
      await page.getByTestId("onboarding-profile-submit").click();
      try {
        await expect(page.getByText("프로필이 저장되었습니다.")).toBeVisible({
          timeout: 5_000,
        });
      } catch {
        await page.getByTestId("onboarding-nickname").fill(nickname);
        await page.getByTestId("onboarding-profile-submit").click();
        await expect(page.getByText("프로필이 저장되었습니다.")).toBeVisible({
          timeout: 10_000,
        });
      }

      const firstCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(firstCheckbox).toBeVisible();
      await firstCheckbox.check();

      const neighborhoodValues = await page
        .getByTestId("onboarding-neighborhood")
        .locator("option")
        .evaluateAll((options) =>
          options
            .map((option) => (option as HTMLOptionElement).value)
            .filter((value) => value.length > 0),
        );
      expect(neighborhoodValues.length).toBeGreaterThan(0);

      await page.getByTestId("onboarding-neighborhood").selectOption(neighborhoodValues[0] ?? "");
      await page.getByTestId("onboarding-neighborhood-submit").click();

      await expect(page).toHaveURL(/\/feed(?:\?.*)?$/);
      const feedContent = page
        .getByTestId("feed-post-list")
        .or(page.getByText("게시글이 없습니다"))
        .or(page.getByText("베스트글이 없습니다"));
      await expect(feedContent.first()).toBeVisible();
    });
  });
}
