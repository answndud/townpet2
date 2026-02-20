export const notificationFilterKindValues = [
  "ALL",
  "COMMENT",
  "REACTION",
  "SYSTEM",
] as const;

export type NotificationFilterKind = (typeof notificationFilterKindValues)[number];

export function parseNotificationFilterKind(
  value: string | null | undefined,
): NotificationFilterKind {
  if (value === "COMMENT" || value === "REACTION" || value === "SYSTEM") {
    return value;
  }
  return "ALL";
}

export function parseUnreadOnly(value: string | null | undefined) {
  return value === "1" || value === "true";
}

export function buildNotificationListHref(
  kind: NotificationFilterKind,
  unreadOnly: boolean,
) {
  const params = new URLSearchParams();
  if (kind !== "ALL") {
    params.set("kind", kind);
  }
  if (unreadOnly) {
    params.set("unreadOnly", "1");
  }

  const query = params.toString();
  return query.length > 0 ? `/notifications?${query}` : "/notifications";
}
