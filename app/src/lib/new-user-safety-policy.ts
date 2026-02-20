import { PostType } from "@prisma/client";

export const NEW_USER_SAFETY_POLICY_KEY = "new_user_safety_policy_v1";
export const DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS = 24;
export const DEFAULT_CONTACT_BLOCK_WINDOW_HOURS = 24;
export const MAX_POLICY_HOURS = 24 * 30;

export const DEFAULT_NEW_USER_RESTRICTED_POST_TYPES: ReadonlyArray<PostType> = [
  PostType.MARKET_LISTING,
  PostType.LOST_FOUND,
  PostType.MEETUP,
];

export type NewUserSafetyPolicy = {
  minAccountAgeHours: number;
  restrictedPostTypes: PostType[];
  contactBlockWindowHours: number;
};

const ALL_POST_TYPES = Object.values(PostType);

function normalizeHours(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const normalized = Math.floor(parsed);
  if (normalized < 0) {
    return 0;
  }
  if (normalized > MAX_POLICY_HOURS) {
    return MAX_POLICY_HOURS;
  }
  return normalized;
}

function normalizeRestrictedPostTypes(
  value: unknown,
  fallback: ReadonlyArray<PostType>,
) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const seen = new Set<PostType>();
  const normalized: PostType[] = [];

  for (const raw of value) {
    if (typeof raw !== "string") {
      continue;
    }
    if (!ALL_POST_TYPES.includes(raw as PostType)) {
      continue;
    }

    const postType = raw as PostType;
    if (seen.has(postType)) {
      continue;
    }
    seen.add(postType);
    normalized.push(postType);
  }

  return normalized;
}

export function normalizeNewUserSafetyPolicy(
  value: unknown,
  fallback: NewUserSafetyPolicy = {
    minAccountAgeHours: DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
    restrictedPostTypes: [...DEFAULT_NEW_USER_RESTRICTED_POST_TYPES],
    contactBlockWindowHours: DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
  },
): NewUserSafetyPolicy {
  if (!value || typeof value !== "object") {
    return {
      minAccountAgeHours: fallback.minAccountAgeHours,
      restrictedPostTypes: [...fallback.restrictedPostTypes],
      contactBlockWindowHours: fallback.contactBlockWindowHours,
    };
  }

  const raw = value as Partial<NewUserSafetyPolicy>;
  return {
    minAccountAgeHours: normalizeHours(
      raw.minAccountAgeHours,
      fallback.minAccountAgeHours,
    ),
    restrictedPostTypes: normalizeRestrictedPostTypes(
      raw.restrictedPostTypes,
      fallback.restrictedPostTypes,
    ),
    contactBlockWindowHours: normalizeHours(
      raw.contactBlockWindowHours,
      fallback.contactBlockWindowHours,
    ),
  };
}
