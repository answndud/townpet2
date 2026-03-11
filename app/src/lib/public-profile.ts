export const PUBLIC_PROFILE_LOGIN_NOTICE = "PROFILE_LOGIN_REQUIRED";

export type PublicProfileActivityTab = "posts" | "comments" | "reactions";

export type PublicProfileVisibilitySettings = {
  showPublicPosts: boolean;
  showPublicComments: boolean;
  showPublicPets: boolean;
};

export function buildPublicProfileLoginHref(userId: string) {
  const params = new URLSearchParams({
    next: `/users/${userId}`,
    notice: PUBLIC_PROFILE_LOGIN_NOTICE,
  });

  return `/login?${params.toString()}`;
}

export function buildPublicProfileTabHref(
  userId: string,
  tab: PublicProfileActivityTab = "posts",
  page = 1,
) {
  const query = new URLSearchParams();
  query.set("tab", tab);
  if (page > 1) {
    query.set("page", String(page));
  }

  return `/users/${userId}?${query.toString()}`;
}

export function getPublicProfileLoginNoticeMessage(notice: string | null) {
  if (notice === PUBLIC_PROFILE_LOGIN_NOTICE) {
    return "프로필을 보려면 로그인해 주세요.";
  }

  return null;
}

export function getVisiblePublicProfileTabs(
  visibility: PublicProfileVisibilitySettings,
) {
  const tabs: PublicProfileActivityTab[] = [];

  if (visibility.showPublicPosts) {
    tabs.push("posts");
  }

  if (visibility.showPublicComments) {
    tabs.push("comments");
  }

  tabs.push("reactions");
  return tabs;
}

export function resolvePublicProfileTab(
  requestedTab: PublicProfileActivityTab,
  visibility: PublicProfileVisibilitySettings,
) {
  const visibleTabs = getVisiblePublicProfileTabs(visibility);
  return visibleTabs.includes(requestedTab) ? requestedTab : visibleTabs[0] ?? "reactions";
}
