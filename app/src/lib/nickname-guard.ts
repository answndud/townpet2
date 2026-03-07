export function hasCompletedNicknameSetup(nickname?: string | null) {
  return Boolean(nickname?.trim());
}

export function shouldRedirectToProfileForNicknameGuard(params: {
  isAuthenticated: boolean;
  nickname?: string | null;
}) {
  return params.isAuthenticated && !hasCompletedNicknameSetup(params.nickname);
}
