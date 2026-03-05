type NotificationUnreadSyncPayload = {
  delta?: number;
  resetTo?: number;
};

const NOTIFICATION_UNREAD_SYNC_EVENT = "townpet:notification-unread-sync";

export function emitNotificationUnreadSync(payload: NotificationUnreadSyncPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<NotificationUnreadSyncPayload>(NOTIFICATION_UNREAD_SYNC_EVENT, {
      detail: payload,
    }),
  );
}

export function subscribeNotificationUnreadSync(
  listener: (payload: NotificationUnreadSyncPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<NotificationUnreadSyncPayload>;
    listener(custom.detail ?? {});
  };

  window.addEventListener(NOTIFICATION_UNREAD_SYNC_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(NOTIFICATION_UNREAD_SYNC_EVENT, handler as EventListener);
  };
}
