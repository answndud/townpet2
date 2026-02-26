import { runtimeEnv } from "@/lib/env";
import { logger, serializeError } from "@/server/logger";
import { ServiceError } from "@/server/services/service-error";

type RateLimitState = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateLimitState>();
const recentAllowCache = new Map<string, number>();

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  cacheMs?: number;
};

type UpstashPipelineCommand = Array<string | number>;
type UpstashPipelineResponse = Array<{
  result?: number | string | null;
  error?: string;
}>;

let redisFailureLoggedAt = 0;

function createRateLimitError() {
  return new ServiceError(
    "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    "RATE_LIMITED",
    429,
  );
}

function enforceMemoryRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= limit) {
    throw createRateLimitError();
  }

  existing.count += 1;
}

async function enforceUpstashRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const endpoint = `${runtimeEnv.upstashRedisRestUrl}/pipeline`;
  const redisKey = `ratelimit:${key}`;
  const payload = await runUpstashPipeline(endpoint, [
    ["SET", redisKey, 0, "PX", windowMs, "NX"],
    ["INCR", redisKey],
    ["PTTL", redisKey],
  ]);
  const count = Number(payload[1]?.result);
  const ttl = Number(payload[2]?.result);

  if (!Number.isFinite(count)) {
    throw new Error("Upstash rate limit malformed response: missing INCR result");
  }

  if (!Number.isFinite(ttl)) {
    throw new Error("Upstash rate limit malformed response: missing PTTL result");
  }

  // Recover from rare cases where key exists without TTL (e.g. legacy writes).
  if (ttl < 0) {
    await runUpstashPipeline(endpoint, [["PEXPIRE", redisKey, windowMs]]);
  }

  if (count > limit) {
    throw createRateLimitError();
  }
}

async function runUpstashPipeline(
  endpoint: string,
  commands: UpstashPipelineCommand[],
): Promise<UpstashPipelineResponse> {
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
    throw new Error(`Upstash rate limit request failed: ${response.status}`);
  }

  const payload = (await response.json()) as UpstashPipelineResponse;
  const commandError = payload.find((item) => item.error);
  if (commandError) {
    throw new Error(`Upstash command error: ${commandError.error}`);
  }

  return payload;
}

export async function enforceRateLimit(options: RateLimitOptions) {
  if (options.cacheMs && options.cacheMs > 0) {
    const cachedAt = recentAllowCache.get(options.key);
    const now = Date.now();
    if (cachedAt && now - cachedAt < options.cacheMs) {
      return;
    }
  }

  if (runtimeEnv.isUpstashConfigured) {
    try {
      await enforceUpstashRateLimit(options);
      if (options.cacheMs && options.cacheMs > 0) {
        recentAllowCache.set(options.key, Date.now());
      }
      return;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      // Avoid noisy logs when Redis is unavailable; fallback still protects per instance.
      const now = Date.now();
      if (now - redisFailureLoggedAt > 60_000) {
        redisFailureLoggedAt = now;
        logger.warn("Redis rate limit 실패로 메모리 fallback을 사용합니다.", {
          error: serializeError(error),
        });
      }
    }
  }

  enforceMemoryRateLimit(options);
  if (options.cacheMs && options.cacheMs > 0) {
    recentAllowCache.set(options.key, Date.now());
  }
}

export async function checkRateLimitHealth() {
  if (!runtimeEnv.isUpstashConfigured) {
    return {
      backend: "memory" as const,
      status: "ok" as const,
      detail: "UPSTASH_REDIS_REST_URL/TOKEN 미설정: memory fallback 사용 중",
    };
  }

  const endpoint = `${runtimeEnv.upstashRedisRestUrl}/ping`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${runtimeEnv.upstashRedisRestToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        backend: "redis" as const,
        status: "error" as const,
        detail: `Redis ping failed: ${response.status}`,
      };
    }

    return {
      backend: "redis" as const,
      status: "ok" as const,
      detail: "Redis ping 성공",
    };
  } catch (error) {
    return {
      backend: "redis" as const,
      status: "error" as const,
      detail: `Redis ping 예외: ${String(error)}`,
    };
  }
}
