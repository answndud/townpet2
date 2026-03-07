import { createHash, createHmac, timingSafeEqual } from "crypto";
import { GuestViolationCategory } from "@prisma/client";

import { runtimeEnv } from "@/lib/env";
import { registerGuestViolation } from "@/server/services/guest-safety.service";
import { ServiceError } from "@/server/services/service-error";

export const guestStepUpScopeValues = [
  "post:create",
  "comment:create",
  "upload",
] as const;

export type GuestStepUpScope = (typeof guestStepUpScopeValues)[number];
export type GuestStepUpRiskLevel = "NORMAL" | "ELEVATED" | "HIGH";

type GuestStepUpPayload = {
  v: 1;
  scope: GuestStepUpScope;
  ipHash: string;
  fingerprintHash: string | null;
  difficulty: number;
  riskLevel: GuestStepUpRiskLevel;
  iat: number;
  exp: number;
};

export type GuestStepUpChallenge = {
  token: string;
  difficulty: number;
  expiresInSeconds: number;
  riskLevel: GuestStepUpRiskLevel;
  signalLabels: string[];
};

type IssueGuestStepUpChallengeParams = {
  scope: GuestStepUpScope;
  ip: string;
  fingerprint?: string;
  userAgent?: string | null;
  forwardedFor?: string | null;
  acceptLanguage?: string | null;
  now?: Date;
};

type AssertGuestStepUpParams = {
  scope: GuestStepUpScope;
  ip: string;
  fingerprint?: string;
  token?: string | null;
  proof?: string | null;
  now?: Date;
};

const GUEST_STEP_UP_TTL_SECONDS = 60 * 3;
const AUTOMATION_USER_AGENT_PATTERN =
  /\b(bot|spider|crawler|curl|wget|python|aiohttp|scrapy|headless|phantom|selenium|playwright|postman|insomnia)\b/i;

function hashIdentityValue(value: string) {
  const normalized = value.trim() || "anonymous";
  if (!runtimeEnv.guestHashPepper) {
    return createHash("sha256").update(normalized).digest("hex");
  }

  return createHmac("sha256", runtimeEnv.guestHashPepper).update(normalized).digest("hex");
}

function resolveGuestStepUpSecret() {
  if (runtimeEnv.guestHashPepper) {
    return `guest-step-up:${runtimeEnv.guestHashPepper}`;
  }
  if (process.env.NODE_ENV === "test") {
    return "guest-step-up:test-secret";
  }
  return `guest-step-up:${runtimeEnv.authSecret || "fallback-secret"}`;
}

function signValue(value: string) {
  return createHmac("sha256", resolveGuestStepUpSecret()).update(value).digest("base64url");
}

function parseForwardedForLength(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length;
}

function assessGuestStepUpRisk(input: {
  fingerprint?: string;
  userAgent?: string | null;
  forwardedFor?: string | null;
  acceptLanguage?: string | null;
}) {
  const signalLabels: string[] = [];
  const hasFingerprint = Boolean(input.fingerprint?.trim() && input.fingerprint.trim().length >= 8);
  const userAgent = input.userAgent?.trim() ?? "";
  const forwardedForLength = parseForwardedForLength(input.forwardedFor);
  const hasAcceptLanguage = Boolean(input.acceptLanguage?.trim());

  if (!hasFingerprint) {
    signalLabels.push("fingerprint 없음");
  }
  if (!userAgent) {
    signalLabels.push("user-agent 없음");
  }
  if (userAgent && AUTOMATION_USER_AGENT_PATTERN.test(userAgent)) {
    signalLabels.push("자동화 UA");
  }
  if (forwardedForLength >= 4) {
    signalLabels.push("프록시 체인 다중");
  }
  if (!hasAcceptLanguage) {
    signalLabels.push("locale 헤더 없음");
  }

  let riskLevel: GuestStepUpRiskLevel = "NORMAL";
  if (
    signalLabels.includes("자동화 UA") ||
    signalLabels.includes("프록시 체인 다중") ||
    signalLabels.length >= 3
  ) {
    riskLevel = "HIGH";
  } else if (
    signalLabels.includes("fingerprint 없음") ||
    signalLabels.includes("user-agent 없음") ||
    signalLabels.length >= 2
  ) {
    riskLevel = "ELEVATED";
  }

  const difficulty =
    riskLevel === "HIGH" ? 4 : riskLevel === "ELEVATED" ? 3 : 2;

  return {
    riskLevel,
    difficulty,
    signalLabels: signalLabels.length > 0 ? signalLabels : ["기본 guest 검증"],
  };
}

function encodePayload(payload: GuestStepUpPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodePayload(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    throw new ServiceError("비회원 추가 확인 토큰이 올바르지 않습니다.", "GUEST_STEP_UP_INVALID", 403);
  }

  const expectedSignature = signValue(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new ServiceError("비회원 추가 확인 토큰이 올바르지 않습니다.", "GUEST_STEP_UP_INVALID", 403);
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as GuestStepUpPayload;

  if (
    payload.v !== 1 ||
    !guestStepUpScopeValues.includes(payload.scope) ||
    !Number.isInteger(payload.difficulty)
  ) {
    throw new ServiceError("비회원 추가 확인 토큰이 올바르지 않습니다.", "GUEST_STEP_UP_INVALID", 403);
  }

  return payload;
}

function isValidProof(token: string, proof: string, difficulty: number) {
  if (!proof.trim()) {
    return false;
  }

  const digest = createHash("sha256").update(`${token}.${proof}`).digest("hex");
  return digest.startsWith("0".repeat(Math.max(1, difficulty)));
}

export function issueGuestStepUpChallenge(
  params: IssueGuestStepUpChallengeParams,
): GuestStepUpChallenge {
  const now = params.now ?? new Date();
  const { riskLevel, difficulty, signalLabels } = assessGuestStepUpRisk({
    fingerprint: params.fingerprint,
    userAgent: params.userAgent,
    forwardedFor: params.forwardedFor,
    acceptLanguage: params.acceptLanguage,
  });
  const payload: GuestStepUpPayload = {
    v: 1,
    scope: params.scope,
    ipHash: hashIdentityValue(params.ip),
    fingerprintHash: params.fingerprint?.trim()
      ? hashIdentityValue(params.fingerprint)
      : null,
    difficulty,
    riskLevel,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(now.getTime() / 1000) + GUEST_STEP_UP_TTL_SECONDS,
  };

  return {
    token: encodePayload(payload),
    difficulty,
    expiresInSeconds: GUEST_STEP_UP_TTL_SECONDS,
    riskLevel,
    signalLabels,
  };
}

async function registerInvalidGuestStepUpAttempt(params: {
  scope: GuestStepUpScope;
  ip: string;
  fingerprint?: string;
}) {
  await registerGuestViolation({
    identity: {
      ip: params.ip,
      fingerprint: params.fingerprint,
    },
    category: GuestViolationCategory.SPAM,
    reason: `Guest step-up validation failed (${params.scope})`,
    source: `guest-step-up:${params.scope}`,
  });
}

export async function assertGuestStepUp(params: AssertGuestStepUpParams) {
  const token = params.token?.trim() ?? "";
  const proof = params.proof?.trim() ?? "";
  if (!token || !proof) {
    throw new ServiceError(
      "비회원 작성 전 추가 확인이 필요합니다.",
      "GUEST_STEP_UP_REQUIRED",
      428,
    );
  }

  let payload: GuestStepUpPayload;
  try {
    payload = decodePayload(token);
  } catch (error) {
    await registerInvalidGuestStepUpAttempt(params);
    throw error;
  }

  const now = Math.floor((params.now ?? new Date()).getTime() / 1000);
  if (payload.scope !== params.scope || payload.exp <= now) {
    throw new ServiceError(
      "추가 확인이 만료되었습니다. 다시 시도해 주세요.",
      "GUEST_STEP_UP_REQUIRED",
      428,
    );
  }

  const currentIpHash = hashIdentityValue(params.ip);
  const currentFingerprintHash = params.fingerprint?.trim()
    ? hashIdentityValue(params.fingerprint)
    : null;
  if (
    payload.ipHash !== currentIpHash ||
    payload.fingerprintHash !== currentFingerprintHash
  ) {
    throw new ServiceError(
      "추가 확인이 만료되었습니다. 다시 시도해 주세요.",
      "GUEST_STEP_UP_REQUIRED",
      428,
    );
  }

  if (!isValidProof(token, proof, payload.difficulty)) {
    await registerInvalidGuestStepUpAttempt(params);
    throw new ServiceError(
      "추가 확인 검증에 실패했습니다. 다시 시도해 주세요.",
      "GUEST_STEP_UP_INVALID",
      403,
    );
  }

  return {
    riskLevel: payload.riskLevel,
    difficulty: payload.difficulty,
  };
}
