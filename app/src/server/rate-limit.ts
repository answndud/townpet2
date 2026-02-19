import { runtimeEnv } from "@/lib/env";
import { logger, serializeError } from "@/server/logger";
import { ServiceError } from "@/server/services/service-error";

type RateLimitState = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateLimitState>();

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

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
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeEnv.upstashRedisRestToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PEXPIRE", redisKey, windowMs],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit request failed: ${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    result?: number | string;
    error?: string;
  }>;

  const commandError = payload.find((item) => item.error);
  if (commandError) {
    throw new Error(`Upstash command error: ${commandError.error}`);
  }

  const count = Number(payload[0]?.result ?? 0);
  if (count > limit) {
    throw createRateLimitError();
  }
}

export async function enforceRateLimit(options: RateLimitOptions) {
  if (runtimeEnv.isUpstashConfigured) {
    try {
      await enforceUpstashRateLimit(options);
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
