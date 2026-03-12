import { afterEach, describe, expect, it, vi } from "vitest";

function stubCacheEnv() {
  vi.stubEnv("QUERY_CACHE_ENABLED", "1");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://cache.example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
}

async function loadQueryCacheModule() {
  vi.resetModules();
  return import("@/server/cache/query-cache");
}

describe("query cache build/runtime behavior", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("skips Upstash fetches during production build phase", async () => {
    stubCacheEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { createQueryCacheKey } = await loadQueryCacheModule();
    const key = await createQueryCacheKey("feed", { page: 1 });

    expect(key).toBe("cache:feed:v1:page=1");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses Upstash fetches at runtime when configured", async () => {
    stubCacheEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: "3" }],
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { createQueryCacheKey } = await loadQueryCacheModule();
    const key = await createQueryCacheKey("feed", { page: 1 });

    expect(key).toBe("cache:feed:v3:page=1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not cache null values when cacheNull is disabled", async () => {
    stubCacheEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-build");

    const { withQueryCache } = await loadQueryCacheModule();
    const fetcher = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("fresh-value");

    const first = await withQueryCache({
      key: "cache:test:null-skip",
      ttlSeconds: 60,
      fetcher,
      cacheNull: false,
    });
    const second = await withQueryCache({
      key: "cache:test:null-skip",
      ttlSeconds: 60,
      fetcher,
      cacheNull: false,
    });

    expect(first).toBeNull();
    expect(second).toBe("fresh-value");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("bypasses cache instead of falling back to process memory when Upstash is unavailable", async () => {
    stubCacheEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    const fetchSpy = vi.fn().mockRejectedValue(new Error("upstash down"));
    vi.stubGlobal("fetch", fetchSpy);

    const { withQueryCache } = await loadQueryCacheModule();
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    const first = await withQueryCache({
      key: "cache:test:upstash-bypass",
      ttlSeconds: 60,
      fetcher,
    });
    const second = await withQueryCache({
      key: "cache:test:upstash-bypass",
      ttlSeconds: 60,
      fetcher,
    });

    expect(first).toBe("first");
    expect(second).toBe("second");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
