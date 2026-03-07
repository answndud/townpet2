export function resolveUserDisplayName(
  nickname: string | null | undefined,
  fallback = "익명",
) {
  const trimmedNickname = nickname?.trim();
  if (trimmedNickname) {
    return trimmedNickname;
  }

  return fallback;
}
