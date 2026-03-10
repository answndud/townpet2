import type { BrowserContext, Page } from "@playwright/test";
import { UserRole } from "@prisma/client";

import { prisma } from "../../src/lib/prisma";
import { hashPassword } from "../../src/server/password";

export const DEFAULT_E2E_PASSWORD =
  process.env.E2E_LOGIN_PASSWORD ??
  process.env.SEED_DEFAULT_PASSWORD ??
  "Password123!";

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
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByTestId("login-email").fill(params.email);
  await page.getByTestId("login-password").fill(params.password ?? DEFAULT_E2E_PASSWORD);
  await page.getByTestId("login-submit").click();
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
