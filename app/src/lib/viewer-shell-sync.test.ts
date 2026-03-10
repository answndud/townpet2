import { afterEach, describe, expect, it, vi } from "vitest";

import { emitViewerShellSync, subscribeViewerShellSync } from "@/lib/viewer-shell-sync";

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  if (typeof originalWindow === "undefined") {
    // @ts-expect-error test cleanup for node env
    delete globalThis.window;
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
      writable: true,
    });
  }

  if (typeof originalLocalStorage === "undefined") {
    // @ts-expect-error test cleanup for node env
    delete globalThis.localStorage;
  } else {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
      writable: true,
    });
  }
});

describe("viewer-shell-sync", () => {
  it("does not throw when window is unavailable", () => {
    // @ts-expect-error node env fallback coverage
    delete globalThis.window;

    expect(() => {
      const unsubscribe = subscribeViewerShellSync(() => undefined);
      emitViewerShellSync({ reason: "no-window" });
      unsubscribe();
    }).not.toThrow();
  });

  it("delivers sync payloads to subscribers", () => {
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        setItem: vi.fn(),
      },
      writable: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribeViewerShellSync(listener);

    emitViewerShellSync({ reason: "preferred-pet-types-updated" });

    expect(listener).toHaveBeenCalledWith({
      reason: "preferred-pet-types-updated",
    });

    unsubscribe();
  });

  it("broadcasts payloads through localStorage for cross-tab listeners", () => {
    const fakeWindow = new EventTarget();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: fakeWindow,
      writable: true,
    });

    const storage = {
      setItem: vi.fn(),
    };
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
      writable: true,
    });

    const listener = vi.fn();
    const unsubscribe = subscribeViewerShellSync(listener);

    const storageEvent = new Event("storage") as StorageEvent;
    Object.defineProperties(storageEvent, {
      key: {
        configurable: true,
        value: "townpet:viewer-shell-sync",
      },
      newValue: {
        configurable: true,
        value: JSON.stringify({ reason: "auth-logout", timestamp: Date.now() }),
      },
    });

    fakeWindow.dispatchEvent(storageEvent);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "auth-logout",
      }),
    );

    unsubscribe();
  });
});
