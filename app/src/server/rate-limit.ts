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

export function enforceRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= limit) {
    throw new ServiceError(
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      "RATE_LIMITED",
      429,
    );
  }

  existing.count += 1;
}
