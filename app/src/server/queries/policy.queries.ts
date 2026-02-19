import { PostType } from "@prisma/client";

import {
  DEFAULT_FORBIDDEN_KEYWORDS,
  FORBIDDEN_KEYWORDS_POLICY_KEY,
  normalizeForbiddenKeywords,
} from "@/lib/forbidden-keyword-policy";
import {
  DEFAULT_LOGIN_REQUIRED_POST_TYPES,
  GUEST_READ_POLICY_KEY,
  normalizeLoginRequiredPostTypes,
} from "@/lib/post-access";
import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";

type SiteSettingRecord = {
  key: string;
  value: unknown;
};

type SiteSettingDelegate = {
  findUnique(args: {
    where: { key: string };
    select: { value: true };
  }): Promise<{ value: unknown } | null>;
  upsert(args: {
    where: { key: string };
    update: { value: unknown };
    create: { key: string; value: unknown };
  }): Promise<SiteSettingRecord>;
};

type SetGuestReadPolicyResult =
  | { ok: true; setting: SiteSettingRecord }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

let missingDelegateWarned = false;

function getSiteSettingDelegate() {
  const delegate = (
    prisma as unknown as { siteSetting?: SiteSettingDelegate }
  ).siteSetting;

  if (!delegate && !missingDelegateWarned) {
    missingDelegateWarned = true;
    logger.warn("Prisma Client에 SiteSetting 모델이 없어 기본 정책 fallback을 사용합니다.");
  }

  return delegate ?? null;
}

export async function getGuestReadLoginRequiredPostTypes() {
  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return [...DEFAULT_LOGIN_REQUIRED_POST_TYPES];
  }

  const setting = await delegate.findUnique({
    where: { key: GUEST_READ_POLICY_KEY },
    select: { value: true },
  });

  return normalizeLoginRequiredPostTypes(
    setting?.value,
    DEFAULT_LOGIN_REQUIRED_POST_TYPES,
  );
}

export async function setGuestReadLoginRequiredPostTypes(types: PostType[]) {
  const normalized = normalizeLoginRequiredPostTypes(
    types,
    DEFAULT_LOGIN_REQUIRED_POST_TYPES,
    { allowEmpty: true },
  );

  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  const setting = await delegate.upsert({
    where: { key: GUEST_READ_POLICY_KEY },
    update: { value: normalized },
    create: { key: GUEST_READ_POLICY_KEY, value: normalized },
  });

  return { ok: true, setting } as const satisfies SetGuestReadPolicyResult;
}

export async function getForbiddenKeywords() {
  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return [...DEFAULT_FORBIDDEN_KEYWORDS];
  }

  const setting = await delegate.findUnique({
    where: { key: FORBIDDEN_KEYWORDS_POLICY_KEY },
    select: { value: true },
  });

  return normalizeForbiddenKeywords(
    setting?.value,
    DEFAULT_FORBIDDEN_KEYWORDS,
  );
}

export async function setForbiddenKeywords(keywords: string[]) {
  const normalized = normalizeForbiddenKeywords(
    keywords,
    DEFAULT_FORBIDDEN_KEYWORDS,
    { allowEmpty: true },
  );

  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  const setting = await delegate.upsert({
    where: { key: FORBIDDEN_KEYWORDS_POLICY_KEY },
    update: { value: normalized },
    create: { key: FORBIDDEN_KEYWORDS_POLICY_KEY, value: normalized },
  });

  return { ok: true, setting } as const satisfies SetGuestReadPolicyResult;
}
