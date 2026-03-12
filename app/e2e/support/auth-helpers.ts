import { expect, type BrowserContext, type Page } from "@playwright/test";
import { UserRole } from "@prisma/client";

import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/server/password";

export const DEFAULT_E2E_PASSWORD =
  process.env.E2E_LOGIN_PASSWORD ??
  process.env.SEED_DEFAULT_PASSWORD ??
  "Password123!";

const SESSION_COOKIE_NAMES = [
  "townpet.session-token",
  "__Secure-townpet.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

type EnsureCredentialUserParams = {
  email: string;
  password?: string;
  nicknamePrefix?: string;
  hasPassword?: boolean;
};

export async function ensureCredentialUser({
  email,
  password = DEFAULT_E2E_PASSWORD,
  nicknamePrefix = "e2e-user",
  hasPassword = true,
}: EnsureCredentialUserParams) {
  const passwordHash = hasPassword ? await hashPassword(password) : null;
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      nickname: `${nicknamePrefix}-${Date.now().toString().slice(-6)}`,
      nicknameUpdatedAt: null,
      bio: null,
      emailVerified: new Date(),
      passwordHash,
    },
    create: {
      email,
      nickname: `${nicknamePrefix}-${Date.now().toString().slice(-6)}`,
      emailVerified: new Date(),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
    },
  });

  await prisma.userSanction.deleteMany({
    where: { userId: user.id },
  });

  return user;
}

type EnsureModeratorUserParams = {
  email: string;
  password?: string;
  role?: UserRole;
  nicknamePrefix?: string;
};

export async function ensureModeratorUser({
  email,
  password = DEFAULT_E2E_PASSWORD,
  role = UserRole.ADMIN,
  nicknamePrefix = "e2e-admin",
}: EnsureModeratorUserParams) {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: {
      role,
      nickname: `${nicknamePrefix}-${Date.now().toString().slice(-6)}`,
      nicknameUpdatedAt: null,
      emailVerified: new Date(),
      passwordHash,
    },
    create: {
      email,
      role,
      nickname: `${nicknamePrefix}-${Date.now().toString().slice(-6)}`,
      emailVerified: new Date(),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
    },
  });
}

export async function loginWithCredentials(
  page: Page,
  params: {
    email: string;
    password?: string;
    next?: string;
  },
) {
  const nextPath = params.next ?? "/feed";
  const targetPathname = new URL(nextPath, "http://localhost").pathname;
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByTestId("login-email").fill(params.email);
  await page.getByTestId("login-password").fill(params.password ?? DEFAULT_E2E_PASSWORD);
  await page.getByTestId("login-submit").click();
  const errorMessage = page.getByText(
    "로그인에 실패했습니다. 입력 정보를 확인하고 다시 시도해 주세요.",
  );

  await Promise.race([
    page.waitForURL(
      (url) => {
        return url.pathname === targetPathname;
      },
      { timeout: 10_000 },
    ),
    errorMessage.waitFor({ state: "visible", timeout: 10_000 }),
  ]);

  if (await errorMessage.isVisible()) {
    return;
  }

  await expect
    .poll(
      async () => {
        const cookies = await page.context().cookies();
        return cookies.some((cookie) => SESSION_COOKIE_NAMES.includes(cookie.name));
      },
      {
        timeout: 10_000,
        message: "expected authenticated session cookie to exist after credentials login",
      },
    )
    .toBe(true);

  if (new URL(page.url()).pathname !== targetPathname) {
    await page.goto(nextPath);
    return;
  }

  await page.reload();
}

export async function loginWithCredentialsApi(
  page: Page,
  params: {
    email: string;
    password?: string;
    next?: string;
  },
) {
  const nextPath = params.next ?? "/feed";
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);

  const baseUrl = new URL(page.url());
  const csrfResponse = await page.context().request.get(
    new URL("/api/auth/csrf", baseUrl).toString(),
  );
  if (!csrfResponse.ok()) {
    throw new Error(`Failed to load CSRF token (${csrfResponse.status()})`);
  }

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  if (!csrfPayload.csrfToken) {
    throw new Error("CSRF token was missing from auth csrf response.");
  }

  const callbackResponse = await page.context().request.post(
    new URL("/api/auth/callback/credentials", baseUrl).toString(),
    {
      headers: {
        "X-Auth-Return-Redirect": "1",
      },
      form: {
        email: params.email,
        password: params.password ?? DEFAULT_E2E_PASSWORD,
        csrfToken: csrfPayload.csrfToken,
        callbackUrl: nextPath,
        json: "true",
      },
    },
  );

  if (!callbackResponse.ok()) {
    throw new Error(`Credentials callback failed (${callbackResponse.status()})`);
  }

  const callbackBody = (await callbackResponse.json().catch(() => null)) as
    | { url?: string }
    | null;
  if (callbackBody?.url?.includes("/login?error=")) {
    throw new Error(`Credentials login was rejected: ${callbackBody.url}`);
  }

  await expect
    .poll(
      async () => {
        const cookies = await page.context().cookies();
        return cookies.some((cookie) => SESSION_COOKIE_NAMES.includes(cookie.name));
      },
      {
        timeout: 10_000,
        message: "expected authenticated session cookie to exist after API credentials login",
      },
    )
    .toBe(true);

  await page.goto(nextPath);
}

export async function loginWithSocialDev(
  page: Page,
  params: {
    provider: "kakao" | "naver";
    next?: string;
  },
) {
  const nextPath = params.next ?? "/feed";
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  const providerLabel = params.provider === "kakao" ? "카카오로 로그인" : "네이버로 로그인";
  await page.getByRole("button", { name: providerLabel }).click();
}

export async function buildCookieHeader(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies
    .filter((cookie) => cookie.domain.includes("localhost") || cookie.domain.includes("127.0.0.1"))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}
