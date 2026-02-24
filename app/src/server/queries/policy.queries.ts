import { PostType, Prisma } from "@prisma/client";

import {
  DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
  DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES,
  NEW_USER_SAFETY_POLICY_KEY,
  normalizeNewUserSafetyPolicy,
  type NewUserSafetyPolicy,
} from "@/lib/new-user-safety-policy";
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
import {
  DEFAULT_GUEST_POST_POLICY,
  GUEST_POST_POLICY_KEY,
  type GuestPostPolicy,
  normalizeGuestPostPolicy,
} from "@/lib/guest-post-policy";
import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

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
let missingTableWarned = false;

function isSiteSettingTableMissingError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

function warnMissingSiteSettingTable(error: unknown) {
  if (missingTableWarned || process.env.NODE_ENV === "test") {
    return;
  }

  missingTableWarned = true;
  logger.warn("SiteSetting 테이블이 없어 기본 정책 fallback을 사용합니다.", {
    error: serializeError(error),
  });
}

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

  let setting: { value: unknown } | null = null;
  try {
    setting = await delegate.findUnique({
      where: { key: GUEST_READ_POLICY_KEY },
      select: { value: true },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return [...DEFAULT_LOGIN_REQUIRED_POST_TYPES];
  }

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

  let setting: SiteSettingRecord;
  try {
    setting = await delegate.upsert({
      where: { key: GUEST_READ_POLICY_KEY },
      update: { value: normalized },
      create: { key: GUEST_READ_POLICY_KEY, value: normalized },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  return { ok: true, setting } as const satisfies SetGuestReadPolicyResult;
}

export async function getForbiddenKeywords() {
  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return [...DEFAULT_FORBIDDEN_KEYWORDS];
  }

  let setting: { value: unknown } | null = null;
  try {
    setting = await delegate.findUnique({
      where: { key: FORBIDDEN_KEYWORDS_POLICY_KEY },
      select: { value: true },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return [...DEFAULT_FORBIDDEN_KEYWORDS];
  }

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

  let setting: SiteSettingRecord;
  try {
    setting = await delegate.upsert({
      where: { key: FORBIDDEN_KEYWORDS_POLICY_KEY },
      update: { value: normalized },
      create: { key: FORBIDDEN_KEYWORDS_POLICY_KEY, value: normalized },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  return { ok: true, setting } as const satisfies SetGuestReadPolicyResult;
}

export async function getNewUserSafetyPolicy() {
  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return normalizeNewUserSafetyPolicy(undefined, {
      minAccountAgeHours: DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
      restrictedPostTypes: [...DEFAULT_NEW_USER_RESTRICTED_POST_TYPES],
      contactBlockWindowHours: DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
    });
  }

  let setting: { value: unknown } | null = null;
  try {
    setting = await delegate.findUnique({
      where: { key: NEW_USER_SAFETY_POLICY_KEY },
      select: { value: true },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return normalizeNewUserSafetyPolicy(undefined, {
      minAccountAgeHours: DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
      restrictedPostTypes: [...DEFAULT_NEW_USER_RESTRICTED_POST_TYPES],
      contactBlockWindowHours: DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
    });
  }

  return normalizeNewUserSafetyPolicy(setting?.value, {
    minAccountAgeHours: DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
    restrictedPostTypes: [...DEFAULT_NEW_USER_RESTRICTED_POST_TYPES],
    contactBlockWindowHours: DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
  });
}

export async function setNewUserSafetyPolicy(input: NewUserSafetyPolicy) {
  const normalized = normalizeNewUserSafetyPolicy(input, {
    minAccountAgeHours: DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
    restrictedPostTypes: [...DEFAULT_NEW_USER_RESTRICTED_POST_TYPES],
    contactBlockWindowHours: DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
  });

  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  let setting: SiteSettingRecord;
  try {
    setting = await delegate.upsert({
      where: { key: NEW_USER_SAFETY_POLICY_KEY },
      update: { value: normalized },
      create: { key: NEW_USER_SAFETY_POLICY_KEY, value: normalized },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  return { ok: true, setting } as const satisfies SetGuestReadPolicyResult;
}

export async function getGuestPostPolicy() {
  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return normalizeGuestPostPolicy(DEFAULT_GUEST_POST_POLICY, DEFAULT_GUEST_POST_POLICY);
  }

  let setting: { value: unknown } | null = null;
  try {
    setting = await delegate.findUnique({
      where: { key: GUEST_POST_POLICY_KEY },
      select: { value: true },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return normalizeGuestPostPolicy(DEFAULT_GUEST_POST_POLICY, DEFAULT_GUEST_POST_POLICY);
  }

  return normalizeGuestPostPolicy(setting?.value, DEFAULT_GUEST_POST_POLICY);
}

export async function setGuestPostPolicy(input: GuestPostPolicy) {
  const normalized = normalizeGuestPostPolicy(input, DEFAULT_GUEST_POST_POLICY);

  const delegate = getSiteSettingDelegate();
  if (!delegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  let setting: SiteSettingRecord;
  try {
    setting = await delegate.upsert({
      where: { key: GUEST_POST_POLICY_KEY },
      update: { value: normalized },
      create: { key: GUEST_POST_POLICY_KEY, value: normalized },
    });
  } catch (error) {
    if (!isSiteSettingTableMissingError(error)) {
      throw error;
    }
    warnMissingSiteSettingTable(error);
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  return { ok: true, setting } as const satisfies SetGuestReadPolicyResult;
}
