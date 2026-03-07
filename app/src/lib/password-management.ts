const SOCIAL_PASSWORD_AUTH_PROVIDERS = new Set(["kakao", "naver"]);

export const PASSWORD_MANAGEMENT_UNAVAILABLE_NOTICE =
  "PASSWORD_MANAGEMENT_UNAVAILABLE";

type PasswordManagementPolicyInput = {
  authProvider?: string | null;
  hasPassword: boolean;
  linkedAccountProviders?: string[];
};

function normalizeProvider(provider: string | null | undefined) {
  return typeof provider === "string" ? provider.trim().toLowerCase() : "";
}

export function isSocialPasswordAuthProvider(provider: string | null | undefined) {
  return SOCIAL_PASSWORD_AUTH_PROVIDERS.has(normalizeProvider(provider));
}

export function canManagePassword({
  authProvider,
  hasPassword,
  linkedAccountProviders = [],
}: PasswordManagementPolicyInput) {
  if (isSocialPasswordAuthProvider(authProvider)) {
    return false;
  }

  if (!authProvider && !hasPassword) {
    return !linkedAccountProviders.some((provider) =>
      isSocialPasswordAuthProvider(provider),
    );
  }

  return true;
}

export function buildPasswordManagementUnavailableHref() {
  const params = new URLSearchParams({
    notice: PASSWORD_MANAGEMENT_UNAVAILABLE_NOTICE,
  });

  return `/profile?${params.toString()}`;
}

export function getPasswordManagementUnavailableMessage() {
  return "네이버·카카오 로그인 계정은 프로필에서 비밀번호 변경을 지원하지 않습니다.";
}

export function getPasswordManagementNoticeMessage(notice: string | null) {
  if (notice === PASSWORD_MANAGEMENT_UNAVAILABLE_NOTICE) {
    return getPasswordManagementUnavailableMessage();
  }

  return null;
}
