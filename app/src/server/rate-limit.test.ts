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

  it("blocks when limit exceeded", () => {
    const options = { key: "test", limit: 2, windowMs: 1000 };

    enforceRateLimit(options);
    enforceRateLimit(options);

    expect(() => enforceRateLimit(options)).toThrow(ServiceError);
  });

  it("resets after window", () => {
    const options = { key: "window", limit: 1, windowMs: 1000 };

    enforceRateLimit(options);
    vi.advanceTimersByTime(1001);

    expect(() => enforceRateLimit(options)).not.toThrow();
  });
});
