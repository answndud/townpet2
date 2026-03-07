import { GuestViolationCategory } from "@prisma/client";
import { createHash, createHmac } from "crypto";

import { DEFAULT_GUEST_POST_POLICY, type GuestPostPolicy } from "@/lib/guest-post-policy";
import { prisma } from "@/lib/prisma";
import { assertSchemaDelegate, rethrowSchemaSyncRequired } from "@/server/schema-sync";
import { ServiceError } from "@/server/services/service-error";

type GuestIdentity = {
  ip: string;
  fingerprint?: string;
};

type GuestBanDelegate = {
  findFirst: (args: unknown) => Promise<{ expiresAt: Date } | null>;
  create: (args: unknown) => Promise<unknown>;
};

type GuestViolationDelegate = {
  create: (args: unknown) => Promise<unknown>;
  count: (args: unknown) => Promise<number>;
};

const HOUR_MS = 60 * 60 * 1000;

function isGuestSafetyTableMissingError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("guestban") ||
    message.includes("guestviolation") ||
    message.includes("p2021") ||
    message.includes("p2022")
  );
}

function getGuestBanDelegate(): GuestBanDelegate | null {
  const delegate = (prisma as unknown as { guestBan?: GuestBanDelegate }).guestBan;
  return delegate ?? null;
}

function getGuestViolationDelegate(): GuestViolationDelegate | null {
  const delegate = (prisma as unknown as { guestViolation?: GuestViolationDelegate })
    .guestViolation;
  return delegate ?? null;
}

function requireGuestBanDelegate() {
  return assertSchemaDelegate(
    getGuestBanDelegate(),
    "GuestBan 모델이 누락되어 비회원 제재 상태를 확인할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function requireGuestViolationDelegate() {
  return assertSchemaDelegate(
    getGuestViolationDelegate(),
    "GuestViolation 모델이 누락되어 비회원 위반 기록을 처리할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function throwGuestSafetySchemaSyncRequired(error: unknown): never {
  rethrowSchemaSyncRequired(
    error,
    "GuestBan/GuestViolation 스키마가 누락되어 비회원 보호 정책을 적용할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
    {
      fallbackPatterns: ["guestban", "guestviolation", "p2021", "p2022"],
    },
  );
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashValueWithPepper(value: string, pepper: string) {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

function resolveGuestHashPepper() {
  return process.env.GUEST_HASH_PEPPER?.trim() ?? "";
}

function getHashCandidates(value: string) {
  const normalized = value.trim() || "anonymous";
  const legacyHash = hashValue(normalized);
  const pepper = resolveGuestHashPepper();
  if (!pepper) {
    return [legacyHash];
  }

  const pepperedHash = hashValueWithPepper(normalized, pepper);
  if (pepperedHash === legacyHash) {
    return [pepperedHash];
  }

  return [pepperedHash, legacyHash];
}

function buildIdentityOrConditions(params: {
  ipHashes: string[];
  fingerprintHashes: string[];
}) {
  return [
    ...params.ipHashes.map((ipHash) => ({ ipHash })),
    ...params.fingerprintHashes.map((fingerprintHash) => ({ fingerprintHash })),
  ];
}

export function hashGuestIdentityCandidates(identity: GuestIdentity) {
  const ipHashes = getHashCandidates(identity.ip);
  const fingerprintHashes = identity.fingerprint?.trim()
    ? getHashCandidates(identity.fingerprint)
    : [];

  return { ipHashes, fingerprintHashes };
}

export function hashGuestIdentity(identity: GuestIdentity) {
  const { ipHashes, fingerprintHashes } = hashGuestIdentityCandidates(identity);
  const ipHash = ipHashes[0] ?? hashValue("anonymous");
  const fingerprintHash = fingerprintHashes[0] ?? null;

  return { ipHash, fingerprintHash };
}

export async function assertGuestNotBanned(identity: GuestIdentity) {
  const now = new Date();
  const { ipHashes, fingerprintHashes } = hashGuestIdentityCandidates(identity);
  const orConditions = buildIdentityOrConditions({ ipHashes, fingerprintHashes });
  const guestBanDelegate = requireGuestBanDelegate();

  let activeBan: { expiresAt: Date } | null = null;
  try {
    activeBan = await guestBanDelegate.findFirst({
      where: {
        expiresAt: { gt: now },
        OR: orConditions,
      },
      orderBy: [{ expiresAt: "desc" }],
      select: { expiresAt: true },
    });
  } catch (error) {
    if (isGuestSafetyTableMissingError(error)) {
      throwGuestSafetySchemaSyncRequired(error);
    }
    throw error;
  }

  if (!activeBan) {
    return;
  }

  throw new ServiceError(
    `비회원 글쓰기가 일시 제한되었습니다. (${activeBan.expiresAt.toLocaleString("ko-KR")} 까지)`,
    "GUEST_TEMP_BANNED",
    403,
  );
}

function resolveBanDurationMs(
  total24h: number,
  total7d: number,
  policy: GuestPostPolicy,
) {
  if (total7d >= policy.banThreshold7dHigh) {
    return policy.banDurationHoursLong * HOUR_MS;
  }
  if (total7d >= policy.banThreshold7dMedium) {
    return policy.banDurationHoursMedium * HOUR_MS;
  }
  if (total24h >= policy.banThreshold24h) {
    return policy.banDurationHoursShort * HOUR_MS;
  }
  return 0;
}

export async function registerGuestViolation(params: {
  identity: GuestIdentity;
  category: GuestViolationCategory;
  reason: string;
  source?: string;
  policy?: GuestPostPolicy;
}) {
  const now = new Date();
  const { ipHash, fingerprintHash } = hashGuestIdentity(params.identity);
  const { ipHashes, fingerprintHashes } = hashGuestIdentityCandidates(params.identity);
  const orConditions = buildIdentityOrConditions({ ipHashes, fingerprintHashes });
  const guestViolationDelegate = requireGuestViolationDelegate();
  const guestBanDelegate = requireGuestBanDelegate();

  try {
    await guestViolationDelegate.create({
      data: {
        ipHash,
        fingerprintHash,
        category: params.category,
      },
    });

    const [violations24h, violations7d] = await Promise.all([
      guestViolationDelegate.count({
        where: {
          createdAt: { gte: new Date(now.getTime() - 24 * HOUR_MS) },
          OR: orConditions,
        },
      }),
      guestViolationDelegate.count({
        where: {
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * HOUR_MS) },
          OR: orConditions,
        },
      }),
    ]);

    const durationMs = resolveBanDurationMs(
      violations24h,
      violations7d,
      params.policy ?? DEFAULT_GUEST_POST_POLICY,
    );
    if (durationMs <= 0) {
      return;
    }

    const activeBan = await guestBanDelegate.findFirst({
      where: {
        expiresAt: { gt: now },
        OR: orConditions,
      },
    });

    if (activeBan) {
      return;
    }

    await guestBanDelegate.create({
      data: {
        ipHash,
        fingerprintHash,
        reason: params.reason,
        source: params.source,
        expiresAt: new Date(now.getTime() + durationMs),
      },
    });
  } catch (error) {
    if (isGuestSafetyTableMissingError(error)) {
      throwGuestSafetySchemaSyncRequired(error);
    }
    throw error;
  }
}

export async function assertGuestSafetyControlPlaneReady() {
  const guestBanDelegate = requireGuestBanDelegate();
  const guestViolationDelegate = requireGuestViolationDelegate();

  try {
    await Promise.all([
      guestBanDelegate.findFirst({
        where: {
          expiresAt: { gt: new Date() },
          OR: [{ ipHash: "__schema_probe__" }, { fingerprintHash: "__schema_probe__" }],
        },
        select: { expiresAt: true },
      }),
      guestViolationDelegate.count({
        where: {
          OR: [{ ipHash: "__schema_probe__" }, { fingerprintHash: "__schema_probe__" }],
        },
      }),
    ]);
  } catch (error) {
    if (isGuestSafetyTableMissingError(error)) {
      throwGuestSafetySchemaSyncRequired(error);
    }
    throw error;
  }
}
