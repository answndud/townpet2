type ViewerShellSyncPayload = {
  reason?: string;
};

const VIEWER_SHELL_SYNC_EVENT = "townpet:viewer-shell-sync";
const VIEWER_SHELL_SYNC_STORAGE_KEY = "townpet:viewer-shell-sync";

function dispatchLocalViewerShellSync(payload: ViewerShellSyncPayload) {
  window.dispatchEvent(
    new CustomEvent<ViewerShellSyncPayload>(VIEWER_SHELL_SYNC_EVENT, {
      detail: payload,
    }),
  );
}

export function emitViewerShellSync(payload: ViewerShellSyncPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  dispatchLocalViewerShellSync(payload);

  try {
    globalThis.localStorage?.setItem(
      VIEWER_SHELL_SYNC_STORAGE_KEY,
      JSON.stringify({
        ...payload,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore storage sync failures and keep local event delivery.
  }
}

export function subscribeViewerShellSync(
  listener: (payload: ViewerShellSyncPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<ViewerShellSyncPayload>;
    listener(custom.detail ?? {});
  };

  window.addEventListener(VIEWER_SHELL_SYNC_EVENT, handler as EventListener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== VIEWER_SHELL_SYNC_STORAGE_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as ViewerShellSyncPayload;
      listener(payload);
    } catch {
      // Ignore invalid storage payloads.
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(VIEWER_SHELL_SYNC_EVENT, handler as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
}
