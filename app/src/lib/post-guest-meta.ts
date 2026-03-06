type GuestPostLike = {
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  guestAuthor?: {
    displayName?: string | null;
    ipDisplay?: string | null;
    ipLabel?: string | null;
  } | null;
};

export function getGuestPostMeta(post: GuestPostLike) {
  const guestAuthorName =
    post.guestDisplayName?.trim() || post.guestAuthor?.displayName?.trim() || "";
  const guestIpDisplay = post.guestIpDisplay ?? post.guestAuthor?.ipDisplay ?? null;
  const guestIpLabel = post.guestIpLabel ?? post.guestAuthor?.ipLabel ?? null;
  const isGuestPost = Boolean(guestAuthorName) || Boolean(post.guestAuthorId);

  return {
    isGuestPost,
    guestAuthorName,
    guestIpDisplay,
    guestIpLabel,
  };
}
