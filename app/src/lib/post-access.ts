import { PostScope, PostType } from "@prisma/client";

export const DEFAULT_LOGIN_REQUIRED_POST_TYPES: PostType[] = [
  PostType.HOSPITAL_REVIEW,
  PostType.MEETUP,
];
export const GUEST_READ_POLICY_KEY = "guest_read_login_required_types";

export function normalizeLoginRequiredPostTypes(
  value: unknown,
  fallback: PostType[] = DEFAULT_LOGIN_REQUIRED_POST_TYPES,
  options?: { allowEmpty?: boolean },
) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const allowed = new Set(Object.values(PostType));
  const normalized = Array.from(
    new Set(
      value.filter(
        (item): item is PostType =>
          typeof item === "string" && allowed.has(item as PostType),
      ),
    ),
  );

  if (normalized.length > 0) {
    return normalized;
  }

  if (options?.allowEmpty && value.length === 0) {
    return [];
  }

  return [...fallback];
}

export function isLoginRequiredPostType(
  type?: PostType | null,
  loginRequiredTypes: PostType[] = DEFAULT_LOGIN_REQUIRED_POST_TYPES,
) {
  if (!type) {
    return false;
  }

  return new Set(loginRequiredTypes).has(type);
}

export function canGuestReadPost(params: {
  scope: PostScope;
  type: PostType;
  loginRequiredTypes?: PostType[];
}) {
  return (
    params.scope === PostScope.GLOBAL &&
    !isLoginRequiredPostType(params.type, params.loginRequiredTypes)
  );
}
