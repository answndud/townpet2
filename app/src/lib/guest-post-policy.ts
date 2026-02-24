import { PostScope, PostType } from "@prisma/client";

export const GUEST_POST_POLICY_KEY = "guest_post_policy_v1";
export const GUEST_MAX_IMAGE_COUNT = 1;
export const GUEST_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const GUEST_POST_RATE_LIMIT_10M = 2;
export const GUEST_POST_RATE_LIMIT_1H = 5;
export const GUEST_POST_RATE_LIMIT_24H = 10;
export const GUEST_UPLOAD_RATE_LIMIT_10M = 2;
export const GUEST_BAN_THRESHOLD_24H = 3;
export const GUEST_BAN_THRESHOLD_7D_MEDIUM = 5;
export const GUEST_BAN_THRESHOLD_7D_HIGH = 8;
export const GUEST_BAN_DURATION_HOURS_SHORT = 24;
export const GUEST_BAN_DURATION_HOURS_MEDIUM = 24 * 7;
export const GUEST_BAN_DURATION_HOURS_LONG = 24 * 30;
export const GUEST_BLOCKED_POST_TYPES: ReadonlyArray<PostType> = [
  PostType.HOSPITAL_REVIEW,
  PostType.MEETUP,
  PostType.MARKET_LISTING,
  PostType.LOST_FOUND,
];

export type GuestPostPolicy = {
  blockedPostTypes: PostType[];
  maxImageCount: number;
  allowLinks: boolean;
  allowContact: boolean;
  enforceGlobalScope: boolean;
  postRateLimit10m: number;
  postRateLimit1h: number;
  postRateLimit24h: number;
  uploadRateLimit10m: number;
  banThreshold24h: number;
  banThreshold7dMedium: number;
  banThreshold7dHigh: number;
  banDurationHoursShort: number;
  banDurationHoursMedium: number;
  banDurationHoursLong: number;
};

export const DEFAULT_GUEST_POST_POLICY: GuestPostPolicy = {
  blockedPostTypes: [...GUEST_BLOCKED_POST_TYPES],
  maxImageCount: GUEST_MAX_IMAGE_COUNT,
  allowLinks: false,
  allowContact: false,
  enforceGlobalScope: true,
  postRateLimit10m: GUEST_POST_RATE_LIMIT_10M,
  postRateLimit1h: GUEST_POST_RATE_LIMIT_1H,
  postRateLimit24h: GUEST_POST_RATE_LIMIT_24H,
  uploadRateLimit10m: GUEST_UPLOAD_RATE_LIMIT_10M,
  banThreshold24h: GUEST_BAN_THRESHOLD_24H,
  banThreshold7dMedium: GUEST_BAN_THRESHOLD_7D_MEDIUM,
  banThreshold7dHigh: GUEST_BAN_THRESHOLD_7D_HIGH,
  banDurationHoursShort: GUEST_BAN_DURATION_HOURS_SHORT,
  banDurationHoursMedium: GUEST_BAN_DURATION_HOURS_MEDIUM,
  banDurationHoursLong: GUEST_BAN_DURATION_HOURS_LONG,
};

const ALL_POST_TYPES = new Set(Object.values(PostType));

function normalizeBlockedPostTypes(value: unknown, fallback: PostType[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return Array.from(
    new Set(
      value.filter(
        (item): item is PostType => typeof item === "string" && ALL_POST_TYPES.has(item as PostType),
      ),
    ),
  );
}

function normalizeImageCount(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(10, Math.floor(parsed)));
}

function normalizePositiveInt(value: unknown, fallback: number, max: number) {
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function normalizeGuestPostPolicy(
  value: unknown,
  fallback: GuestPostPolicy = DEFAULT_GUEST_POST_POLICY,
): GuestPostPolicy {
  if (!value || typeof value !== "object") {
    return { ...fallback, blockedPostTypes: [...fallback.blockedPostTypes] };
  }

  const raw = value as Partial<GuestPostPolicy>;
  return {
    blockedPostTypes: normalizeBlockedPostTypes(raw.blockedPostTypes, fallback.blockedPostTypes),
    maxImageCount: normalizeImageCount(raw.maxImageCount, fallback.maxImageCount),
    allowLinks: normalizeBoolean(raw.allowLinks, fallback.allowLinks),
    allowContact: normalizeBoolean(raw.allowContact, fallback.allowContact),
    enforceGlobalScope: normalizeBoolean(raw.enforceGlobalScope, fallback.enforceGlobalScope),
    postRateLimit10m: normalizePositiveInt(raw.postRateLimit10m, fallback.postRateLimit10m, 200),
    postRateLimit1h: normalizePositiveInt(raw.postRateLimit1h, fallback.postRateLimit1h, 1000),
    postRateLimit24h: normalizePositiveInt(raw.postRateLimit24h, fallback.postRateLimit24h, 5000),
    uploadRateLimit10m: normalizePositiveInt(raw.uploadRateLimit10m, fallback.uploadRateLimit10m, 200),
    banThreshold24h: normalizePositiveInt(raw.banThreshold24h, fallback.banThreshold24h, 100),
    banThreshold7dMedium: normalizePositiveInt(
      raw.banThreshold7dMedium,
      fallback.banThreshold7dMedium,
      500,
    ),
    banThreshold7dHigh: normalizePositiveInt(raw.banThreshold7dHigh, fallback.banThreshold7dHigh, 500),
    banDurationHoursShort: normalizePositiveInt(
      raw.banDurationHoursShort,
      fallback.banDurationHoursShort,
      24 * 365,
    ),
    banDurationHoursMedium: normalizePositiveInt(
      raw.banDurationHoursMedium,
      fallback.banDurationHoursMedium,
      24 * 365,
    ),
    banDurationHoursLong: normalizePositiveInt(
      raw.banDurationHoursLong,
      fallback.banDurationHoursLong,
      24 * 365,
    ),
  };
}

export function isGuestPostTypeBlocked(type: PostType, blockedTypes: ReadonlyArray<PostType>) {
  return new Set(blockedTypes).has(type);
}

export function isGuestScopeAllowed(scope: PostScope, enforceGlobalScope: boolean) {
  if (!enforceGlobalScope) {
    return true;
  }
  return scope === PostScope.GLOBAL;
}
