import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runtimeEnv } from "@/lib/env";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

type MutableRuntimeEnv = {
  upstashRedisRestUrl: string;
  upstashRedisRestToken: string;
  isUpstashConfigured: boolean;
};

const mutableRuntimeEnv = runtimeEnv as unknown as MutableRuntimeEnv;
const originalRuntimeEnv = {
  upstashRedisRestUrl: mutableRuntimeEnv.upstashRedisRestUrl,
  upstashRedisRestToken: mutableRuntimeEnv.upstashRedisRestToken,
  isUpstashConfigured: mutableRuntimeEnv.isUpstashConfigured,
};

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("rate limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    mutableRuntimeEnv.isUpstashConfigured = false;
    mutableRuntimeEnv.upstashRedisRestUrl = "";
    mutableRuntimeEnv.upstashRedisRestToken = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    mutableRuntimeEnv.isUpstashConfigured = originalRuntimeEnv.isUpstashConfigured;
    mutableRuntimeEnv.upstashRedisRestUrl = originalRuntimeEnv.upstashRedisRestUrl;
    mutableRuntimeEnv.upstashRedisRestToken = originalRuntimeEnv.upstashRedisRestToken;
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

  it("uses fixed-window semantics for upstash backend", async () => {
    mutableRuntimeEnv.isUpstashConfigured = true;
    mutableRuntimeEnv.upstashRedisRestUrl = "https://upstash.test";
    mutableRuntimeEnv.upstashRedisRestToken = "token";

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([{ result: "OK" }, { result: 1 }, { result: 60_000 }]))
      .mockResolvedValueOnce(
        jsonResponse([{ result: null }, { result: 2 }, { result: 59_000 }]),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ result: null }, { result: 3 }, { result: 58_000 }]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const options = { key: "remote-fixed", limit: 2, windowMs: 60_000 };
    await enforceRateLimit(options);
    await enforceRateLimit(options);
    await expect(enforceRateLimit(options)).rejects.toBeInstanceOf(ServiceError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstPayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Array<
      Array<string | number>
    >;
    expect(firstPayload).toEqual([
      ["SET", "ratelimit:remote-fixed", 0, "PX", 60_000, "NX"],
      ["INCR", "ratelimit:remote-fixed"],
      ["PTTL", "ratelimit:remote-fixed"],
    ]);
  });

  it("repairs missing ttl for upstash keys", async () => {
    mutableRuntimeEnv.isUpstashConfigured = true;
    mutableRuntimeEnv.upstashRedisRestUrl = "https://upstash.test";
    mutableRuntimeEnv.upstashRedisRestToken = "token";

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse([{ result: null }, { result: 2 }, { result: -1 }]),
      )
      .mockResolvedValueOnce(jsonResponse([{ result: 1 }]));
    vi.stubGlobal("fetch", fetchMock);

    await enforceRateLimit({ key: "ttl-fix", limit: 5, windowMs: 1000 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const repairPayload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as Array<
      Array<string | number>
    >;
    expect(repairPayload).toEqual([["PEXPIRE", "ratelimit:ttl-fix", 1000]]);
  });
});
