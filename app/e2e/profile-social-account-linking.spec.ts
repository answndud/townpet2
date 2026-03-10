import { expect, test } from "@playwright/test";

import { OAUTH_LINK_INTENT_KEY } from "../src/lib/oauth-link-intent";
import { prisma } from "../src/lib/prisma";
import {
  ensureCredentialUser,
  loginWithCredentials,
  loginWithSocialDev,
} from "./support/auth-helpers";

const SOCIAL_DEV_ENABLED = ["1", "true", "yes"].includes(
  (process.env.ENABLE_SOCIAL_DEV_LOGIN ?? "").trim().toLowerCase(),
);

test.describe("profile social account linking", () => {
  test("links a kakao account from profile in local dev mode", async ({ page }) => {
    test.skip(!SOCIAL_DEV_ENABLED, "ENABLE_SOCIAL_DEV_LOGIN=1 환경에서만 실행합니다.");

    const email = "e2e.profile.link@townpet.dev";
    const user = await ensureCredentialUser({
      email,
      nicknamePrefix: "e2e-profile-link",
    });

    await prisma.account.deleteMany({
      where: {
        userId: user.id,
        provider: {
          in: ["kakao", "naver"],
        },
      },
    });

    await loginWithCredentials(page, {
      email,
      next: "/feed",
    });

    await expect(page).toHaveURL(/\/feed(?:\?.*)?$/);
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile(?:\?.*)?$/);
    await expect(page.getByTestId("profile-social-account-connections")).toBeVisible();

    await page.getByTestId("profile-social-connect-kakao").click();

    await expect(page).toHaveURL(/notice=SOCIAL_ACCOUNT_LINKED_KAKAO/);
    await expect(page.getByTestId("profile-social-provider-linked-kakao")).toBeVisible();
    await expect(
      page.getByText(
        "카카오 로그인을 이 계정에 연결했습니다. 다음부터는 카카오로도 같은 계정에 로그인할 수 있습니다.",
      ),
    ).toBeVisible();

    const linkedAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "kakao",
      },
      select: {
        providerAccountId: true,
      },
    });

    expect(linkedAccount?.providerAccountId).toBe(`social-dev:kakao:${user.id}`);
  });

  test("unlinks a linked kakao account from profile when another login method remains", async ({
    page,
  }) => {
    test.skip(!SOCIAL_DEV_ENABLED, "ENABLE_SOCIAL_DEV_LOGIN=1 환경에서만 실행합니다.");

    const email = "e2e.profile.unlink@townpet.dev";
    const user = await ensureCredentialUser({
      email,
      nicknamePrefix: "e2e-profile-unlink",
      hasPassword: true,
    });

    await prisma.account.deleteMany({
      where: {
        userId: user.id,
        provider: {
          in: ["kakao", "naver"],
        },
      },
    });

    await loginWithCredentials(page, {
      email,
      next: "/profile",
    });

    await expect(page).toHaveURL(/\/profile(?:\?.*)?$/);
    await page.getByTestId("profile-social-connect-kakao").click();
    await expect(page.getByTestId("profile-social-provider-linked-kakao")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("profile-social-unlink-kakao").click();

    await expect(page).toHaveURL(/notice=SOCIAL_ACCOUNT_UNLINKED_KAKAO/);
    await expect(page.getByTestId("profile-social-connect-kakao")).toBeVisible();
    await expect(
      page.getByText(
        "카카오 로그인을 이 계정에서 해제했습니다. 다음 로그인부터는 남아 있는 로그인 수단을 사용해 주세요.",
      ),
    ).toBeVisible();

    const linkedAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "kakao",
      },
      select: {
        id: true,
      },
    });

    expect(linkedAccount).toBeNull();
  });

  test("disables unlink when a passwordless account would lose its last login method", async ({
    page,
  }) => {
    test.skip(!SOCIAL_DEV_ENABLED, "ENABLE_SOCIAL_DEV_LOGIN=1 환경에서만 실행합니다.");

    const email = (process.env.E2E_SOCIAL_KAKAO_EMAIL ?? "e2e.kakao@townpet.dev")
      .trim()
      .toLowerCase();
    const user = await ensureCredentialUser({
      email,
      nicknamePrefix: "e2e-social-only",
      hasPassword: false,
    });

    await prisma.account.deleteMany({
      where: {
        userId: user.id,
        provider: {
          in: ["kakao", "naver"],
        },
      },
    });

    await loginWithSocialDev(page, {
      provider: "kakao",
      next: "/profile",
    });

    await expect(page).toHaveURL(/\/profile(?:\?.*)?$/);
    await page.getByTestId("profile-social-connect-kakao").click();
    await expect(page.getByTestId("profile-social-provider-linked-kakao")).toBeVisible();

    const unlinkButton = page.getByTestId("profile-social-unlink-kakao");
    await expect(unlinkButton).toBeDisabled();
    await expect(page.getByText("유일한 로그인 수단")).toBeVisible();

    const linkedAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "kakao",
      },
      select: {
        providerAccountId: true,
      },
    });

    expect(linkedAccount?.providerAccountId).toBe(`social-dev:kakao:${user.id}`);
  });

  test("shows OAuthAccountNotLinked recovery guidance with pending profile link intent", async ({
    page,
  }) => {
    await page.addInitScript(([storageKey]) => {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          provider: "kakao",
          returnPath: "/profile",
        }),
      );
    }, [OAUTH_LINK_INTENT_KEY]);

    await page.goto("/login?error=OAuthAccountNotLinked");

    await expect(
      page.getByText(
        "카카오 계정 연결에 실패했습니다. 이미 다른 TownPet 계정에 연결되어 있거나 아직 현재 계정에 연결되지 않았을 수 있습니다. 원래 로그인 방식으로 먼저 접속한 뒤 프로필의 계정 연동에서 다시 확인해 주세요.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "프로필로 돌아가 계정 연동 확인" }),
    ).toHaveAttribute("href", "/profile");
  });
});
