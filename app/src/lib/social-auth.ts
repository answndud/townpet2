export const SOCIAL_AUTH_PROVIDERS = ["kakao", "naver"] as const;

export type SocialAuthProvider = (typeof SOCIAL_AUTH_PROVIDERS)[number];

const providerLabels: Record<SocialAuthProvider, string> = {
  kakao: "카카오",
  naver: "네이버",
};

function normalizeProvider(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isSocialAuthProvider(value: string | null | undefined): value is SocialAuthProvider {
  return SOCIAL_AUTH_PROVIDERS.includes(normalizeProvider(value) as SocialAuthProvider);
}

export function normalizeSocialAuthProvider(
  value: string | null | undefined,
): SocialAuthProvider | null {
  return isSocialAuthProvider(value) ? normalizeProvider(value) as SocialAuthProvider : null;
}

export function getSocialAuthProviderLabel(provider: SocialAuthProvider) {
  return providerLabels[provider];
}

export function getAuthProviderLabel(provider: string | null | undefined) {
  const normalized = normalizeProvider(provider);
  if (!normalized || normalized === "credentials" || normalized === "email") {
    return "이메일";
  }

  if (normalized === "social-dev") {
    return "개발용 소셜 로그인";
  }

  const socialProvider = normalizeSocialAuthProvider(normalized);
  if (socialProvider) {
    return getSocialAuthProviderLabel(socialProvider);
  }

  return normalized;
}

export function buildSocialAccountLinkedNotice(provider: SocialAuthProvider) {
  return `SOCIAL_ACCOUNT_LINKED_${provider.toUpperCase()}` as const;
}

export function buildSocialAccountUnlinkedNotice(provider: SocialAuthProvider) {
  return `SOCIAL_ACCOUNT_UNLINKED_${provider.toUpperCase()}` as const;
}

export function buildSocialAccountProviderAlreadyConnectedNotice(
  provider: SocialAuthProvider,
) {
  return `SOCIAL_ACCOUNT_PROVIDER_ALREADY_CONNECTED_${provider.toUpperCase()}` as const;
}

function getProviderFromPrefixedNotice(
  notice: string,
  prefix: string,
): SocialAuthProvider | null {
  if (!notice.startsWith(prefix)) {
    return null;
  }

  return normalizeSocialAuthProvider(notice.slice(prefix.length));
}

export function getSocialAccountNoticeMessage(notice: string | null) {
  if (!notice) {
    return null;
  }

  const linkedProvider = getProviderFromPrefixedNotice(notice, "SOCIAL_ACCOUNT_LINKED_");
  if (linkedProvider) {
    const label = getSocialAuthProviderLabel(linkedProvider);
    return `${label} 로그인을 이 계정에 연결했습니다. 다음부터는 ${label}로도 같은 계정에 로그인할 수 있습니다.`;
  }

  const unlinkedProvider = getProviderFromPrefixedNotice(notice, "SOCIAL_ACCOUNT_UNLINKED_");
  if (unlinkedProvider) {
    const label = getSocialAuthProviderLabel(unlinkedProvider);
    return `${label} 로그인을 이 계정에서 해제했습니다. 다음 로그인부터는 남아 있는 로그인 수단을 사용해 주세요.`;
  }

  const alreadyConnectedProvider = getProviderFromPrefixedNotice(
    notice,
    "SOCIAL_ACCOUNT_PROVIDER_ALREADY_CONNECTED_",
  );
  if (alreadyConnectedProvider) {
    const label = getSocialAuthProviderLabel(alreadyConnectedProvider);
    return `이 계정에는 이미 ${label} 로그인이 연결되어 있습니다. 다른 ${label} 계정은 추가로 연결할 수 없습니다.`;
  }

  return null;
}

type OAuthErrorMessageOptions = {
  pendingLinkProvider?: SocialAuthProvider | null;
};

export function getOAuthErrorMessage(
  oauthError: string | null,
  options: OAuthErrorMessageOptions = {},
) {
  if (!oauthError) {
    return null;
  }

  if (oauthError === "KAKAO_EMAIL_REQUIRED") {
    return "카카오 계정 이메일 제공 동의가 필요합니다. 동의 후 다시 시도해 주세요.";
  }

  if (oauthError === "NAVER_EMAIL_REQUIRED") {
    return "네이버 계정 이메일 제공 동의가 필요합니다. 동의 후 다시 시도해 주세요.";
  }

  if (oauthError === "OAuthAccountNotLinked" || oauthError === "AccountNotLinked") {
    if (options.pendingLinkProvider) {
      const label = getSocialAuthProviderLabel(options.pendingLinkProvider);
      return `${label} 계정 연결에 실패했습니다. 이미 다른 TownPet 계정에 연결되어 있거나 아직 현재 계정에 연결되지 않았을 수 있습니다. 원래 로그인 방식으로 먼저 접속한 뒤 프로필의 계정 연동에서 다시 확인해 주세요.`;
    }

    return "같은 이메일에 연결된 기존 로그인 방식이 있습니다. 원래 사용하던 이메일 로그인 또는 기존 소셜 로그인으로 먼저 접속한 뒤 프로필에서 소셜 로그인을 연결해 주세요.";
  }

  if (oauthError === "ACCOUNT_SUSPENDED") {
    return "제재 중인 계정은 현재 로그인할 수 없습니다. 제재 해제 후 다시 시도해 주세요.";
  }

  if (oauthError === "ACCOUNT_PERMANENTLY_BANNED") {
    return "영구 정지된 계정은 로그인할 수 없습니다.";
  }

  return "소셜 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
