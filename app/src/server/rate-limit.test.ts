import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

describe("rate limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks when limit exceeded", async () => {
    const options = { key: "test", limit: 2, windowMs: 1000 };

    await enforceRateLimit(options);
    await enforceRateLimit(options);

    await expect(enforceRateLimit(options)).rejects.toBeInstanceOf(ServiceError);
  });

  it("resets after window", async () => {
    const options = { key: "window", limit: 1, windowMs: 1000 };

    await enforceRateLimit(options);
    vi.advanceTimersByTime(1001);

    await expect(enforceRateLimit(options)).resolves.toBeUndefined();
  });
});
