import { runtimeEnv } from "@/lib/env";
import { logger, serializeError } from "@/server/logger";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

type CacheKeyParts = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number>
>;

type UpstashPipelineCommand = Array<string | number>;
type UpstashPipelineResponse = Array<{
  result?: number | string | null;
  error?: string;
}>;

const memoryCache = new Map<string, CacheEntry>();
const memoryVersions = new Map<string, number>();
const DEFAULT_VERSION = 1;
let redisFailureLoggedAt = 0;

function shouldUseCache() {
  return runtimeEnv.queryCacheEnabled;
}

function getNow() {
  return Date.now();
}

function normalizePartValue(value: CacheKeyParts[string]) {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).sort().join(",");
  }
  return String(value);
}

function serializeParts(parts: CacheKeyParts) {
  return Object.keys(parts)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(normalizePartValue(parts[key]))}`)
    .join("&");
}

function looksLikeIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

function reviveDates(key: string, value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  if (!key.endsWith("At") || !looksLikeIsoDate(value)) {
    return value;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return new Date(parsed);
}

async function runUpstashPipeline(commands: UpstashPipelineCommand[]) {
  const endpoint = `${runtimeEnv.upstashRedisRestUrl}/pipeline`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeEnv.upstashRedisRestToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash cache request failed: ${response.status}`);
  }

  const payload = (await response.json()) as UpstashPipelineResponse;
  const commandError = payload.find((item) => item.error);
  if (commandError) {
    throw new Error(`Upstash cache command error: ${commandError.error}`);
  }

  return payload;
}

async function getCacheValue(key: string) {
  if (!shouldUseCache()) {
    return null;
  }

  if (runtimeEnv.isUpstashConfigured) {
    try {
      const payload = await runUpstashPipeline([["GET", key]]);
      const raw = payload[0]?.result;
      return typeof raw === "string" ? raw : null;
    } catch (error) {
      const now = getNow();
      if (now - redisFailureLoggedAt > 60_000) {
        redisFailureLoggedAt = now;
        logger.warn("Redis cache read failed; using memory fallback.", {
          error: serializeError(error),
        });
      }
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= getNow()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function setCacheValue(key: string, value: string, ttlSeconds: number) {
  if (!shouldUseCache()) {
    return;
  }

  const ttlMs = Math.max(ttlSeconds, 1) * 1000;
  if (runtimeEnv.isUpstashConfigured) {
    try {
      await runUpstashPipeline([["SET", key, value, "PX", ttlMs]]);
      return;
    } catch (error) {
      const now = getNow();
      if (now - redisFailureLoggedAt > 60_000) {
        redisFailureLoggedAt = now;
        logger.warn("Redis cache write failed; using memory fallback.", {
          error: serializeError(error),
        });
      }
    }
  }

  memoryCache.set(key, { value, expiresAt: getNow() + ttlMs });
}

export async function getCacheVersion(bucket: string) {
  if (!shouldUseCache()) {
    return DEFAULT_VERSION;
  }

  if (runtimeEnv.isUpstashConfigured) {
    try {
      const payload = await runUpstashPipeline([["GET", `cache:version:${bucket}`]]);
      const raw = payload[0]?.result;
      const numeric = Number(raw);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_VERSION;
    } catch (error) {
      const now = getNow();
      if (now - redisFailureLoggedAt > 60_000) {
        redisFailureLoggedAt = now;
        logger.warn("Redis cache version read failed; using default.", {
          error: serializeError(error),
        });
      }
      return DEFAULT_VERSION;
    }
  }

  return memoryVersions.get(bucket) ?? DEFAULT_VERSION;
}

export async function bumpCacheVersion(bucket: string) {
  if (!shouldUseCache()) {
    return;
  }

  if (runtimeEnv.isUpstashConfigured) {
    try {
      await runUpstashPipeline([["INCR", `cache:version:${bucket}`]]);
      return;
    } catch (error) {
      const now = getNow();
      if (now - redisFailureLoggedAt > 60_000) {
        redisFailureLoggedAt = now;
        logger.warn("Redis cache version bump failed; using memory fallback.", {
          error: serializeError(error),
        });
      }
    }
  }

  const current = memoryVersions.get(bucket) ?? DEFAULT_VERSION;
  memoryVersions.set(bucket, current + 1);
}

export async function createQueryCacheKey(bucket: string, parts: CacheKeyParts) {
  const version = await getCacheVersion(bucket);
  return `cache:${bucket}:v${version}:${serializeParts(parts)}`;
}

export async function withQueryCache<T>(params: {
  key: string;
  ttlSeconds: number;
  fetcher: () => Promise<T>;
}) {
  if (!shouldUseCache()) {
    return params.fetcher();
  }

  try {
    const cached = await getCacheValue(params.key);
    if (cached) {
      return JSON.parse(cached, reviveDates) as T;
    }
  } catch (error) {
    logger.warn("Cache parse failed; running source query.", {
      error: serializeError(error),
    });
  }

  const fresh = await params.fetcher();
  try {
    await setCacheValue(params.key, JSON.stringify(fresh), params.ttlSeconds);
  } catch (error) {
    logger.warn("Cache write failed; returning source data.", {
      error: serializeError(error),
    });
  }
  return fresh;
}

export function buildCacheControlHeader(sMaxAge: number, staleWhileRevalidate: number) {
  const safeSMaxAge = Math.max(sMaxAge, 1);
  const safeStale = Math.max(staleWhileRevalidate, 1);
  return `public, s-maxage=${safeSMaxAge}, stale-while-revalidate=${safeStale}`;
}

export async function bumpFeedCacheVersion() {
  return bumpCacheVersion("feed");
}

export async function bumpSearchCacheVersion() {
  return bumpCacheVersion("search");
}

export async function bumpSuggestCacheVersion() {
  return bumpCacheVersion("suggest");
}

export async function bumpPopularCacheVersion() {
  return bumpCacheVersion("popular");
}

export async function bumpPostDetailCacheVersion() {
  return bumpCacheVersion("post-detail");
}

export async function bumpPostCommentsCacheVersion() {
  return bumpCacheVersion("post-comments");
}
