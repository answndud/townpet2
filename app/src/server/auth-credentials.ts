import { type User } from "next-auth";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import {
  LOGIN_ACCOUNT_IP_RULE_PREFIX,
  buildLoginRateLimitRules,
  type LoginRateLimitRule,
} from "@/server/auth-login-rate-limit";
import { recordAuthAuditEvent } from "@/server/auth-audit-log";
import { verifyPassword } from "@/server/password";
import { getClientIp } from "@/server/request-context";
import {
  clearRateLimitKeys,
  enforceRateLimitAndReturnState,
} from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

const LOGIN_DELAY_STEP_MS = 750;
const LOGIN_DELAY_MAX_MS = 5_000;

type LoginRequestLike = {
  headers: Headers;
};

function resolveLoginRequestMeta(request?: LoginRequestLike) {
  const headers = request?.headers;

  return {
    clientIp: headers ? getClientIp(headers) : "anonymous",
    userAgent: headers?.get("user-agent")?.trim().slice(0, 512) || null,
  };
}

function findAccountIpAttemptCount(
  rules: LoginRateLimitRule[],
  states: Array<{ key: string; count: number }>,
) {
  const accountIpRule = rules.find((rule) => rule.key.startsWith(LOGIN_ACCOUNT_IP_RULE_PREFIX));
  if (!accountIpRule) {
    return 1;
  }

  return states.find((state) => state.key === accountIpRule.key)?.count ?? 1;
}

export function resolveFailedLoginDelayMs(attemptCount: number) {
  if (attemptCount <= 2) {
    return 0;
  }

  return Math.min((attemptCount - 2) * LOGIN_DELAY_STEP_MS, LOGIN_DELAY_MAX_MS);
}

async function waitForFailedLoginDelay(delayMs: number) {
  if (delayMs <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function handleFailedLogin(params: {
  email: string;
  userId?: string | null;
  ipAddress: string;
  userAgent?: string | null;
  reasonCode: string;
  attemptCount: number;
}) {
  await recordAuthAuditEvent({
    action: "LOGIN_FAILURE",
    userId: params.userId ?? null,
    email: params.email,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent ?? null,
    reasonCode: params.reasonCode,
  });

  await waitForFailedLoginDelay(resolveFailedLoginDelayMs(params.attemptCount));
}

function toAuthorizedUser(user: {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  image: string | null;
  sessionVersion: number;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    image: user.image,
    sessionVersion: user.sessionVersion,
  };
}

export async function authorizeCredentialsLogin(
  credentials: Partial<Record<"email" | "password", unknown>> | undefined,
  request?: LoginRequestLike,
) {
  const rawEmail = typeof credentials?.email === "string" ? credentials.email : "";
  const { clientIp, userAgent } = resolveLoginRequestMeta(request);
  const rateLimitRules = buildLoginRateLimitRules({
    email: rawEmail,
    clientIp,
  });
  const rateLimitStates: Array<{ key: string; count: number }> = [];

  try {
    for (const rule of rateLimitRules) {
      const state = await enforceRateLimitAndReturnState(rule);
      rateLimitStates.push({
        key: rule.key,
        count: state.count,
      });
    }
  } catch (error) {
    if (error instanceof ServiceError && error.code === "RATE_LIMITED") {
      await recordAuthAuditEvent({
        action: "LOGIN_RATE_LIMITED",
        email: rawEmail,
        ipAddress: clientIp,
        userAgent,
        reasonCode: "RATE_LIMITED",
      });
      return null;
    }

    return null;
  }

  const attemptCount = findAccountIpAttemptCount(rateLimitRules, rateLimitStates);
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    await handleFailedLogin({
      email: rawEmail,
      ipAddress: clientIp,
      userAgent,
      reasonCode: "INVALID_INPUT",
      attemptCount,
    });
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      image: true,
      passwordHash: true,
      emailVerified: true,
      sessionVersion: true,
    },
  });

  if (!existingUser) {
    await handleFailedLogin({
      email: parsed.data.email,
      ipAddress: clientIp,
      userAgent,
      reasonCode: "USER_NOT_FOUND",
      attemptCount,
    });
    return null;
  }

  if (!existingUser.passwordHash) {
    await handleFailedLogin({
      email: parsed.data.email,
      userId: existingUser.id,
      ipAddress: clientIp,
      userAgent,
      reasonCode: "PASSWORD_NOT_SET",
      attemptCount,
    });
    return null;
  }

  if (!existingUser.emailVerified) {
    await handleFailedLogin({
      email: parsed.data.email,
      userId: existingUser.id,
      ipAddress: clientIp,
      userAgent,
      reasonCode: "EMAIL_NOT_VERIFIED",
      attemptCount,
    });
    return null;
  }

  const isValid = await verifyPassword(
    parsed.data.password,
    existingUser.passwordHash,
  );
  if (!isValid) {
    await handleFailedLogin({
      email: parsed.data.email,
      userId: existingUser.id,
      ipAddress: clientIp,
      userAgent,
      reasonCode: "INVALID_PASSWORD",
      attemptCount,
    });
    return null;
  }

  await recordAuthAuditEvent({
    action: "LOGIN_SUCCESS",
    userId: existingUser.id,
    email: existingUser.email,
    ipAddress: clientIp,
    userAgent,
  });
  await clearRateLimitKeys(rateLimitRules.slice(1).map((rule) => rule.key));

  return toAuthorizedUser(existingUser);
}
