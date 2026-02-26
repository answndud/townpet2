import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";
import { bumpPopularCacheVersion, createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";

type SearchTermStatRecord = {
  termDisplay: string;
};

type SearchTermStatDelegate = {
  findMany(args: {
    take: number;
    orderBy: [{ count: "desc" }, { updatedAt: "desc" }];
    select: { termDisplay: true };
  }): Promise<SearchTermStatRecord[]>;
  upsert(args: {
    where: { termNormalized: string };
    update: {
      termDisplay: string;
      count: { increment: number };
    };
    create: {
      termNormalized: string;
      termDisplay: string;
      count: number;
    };
  }): Promise<unknown>;
};

let missingSearchTermStatDelegateWarned = false;

function getSearchTermStatDelegate() {
  const delegate = (
    prisma as unknown as { searchTermStat?: SearchTermStatDelegate }
  ).searchTermStat;

  if (!delegate && !missingSearchTermStatDelegateWarned) {
    missingSearchTermStatDelegateWarned = true;
    logger.warn(
      "Prisma Client에 SearchTermStat 모델이 없어 검색 통계를 기록할 수 없습니다.",
    );
  }

  return delegate ?? null;
}

function normalizeTerm(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 50) {
    return null;
  }
  return normalized;
}

export async function getPopularSearchTerms(limit = 8) {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return [] as string[];
  }

  const cacheKey = await createQueryCacheKey("popular", { limit: safeLimit });
  return withQueryCache({
    key: cacheKey,
    ttlSeconds: 300,
    fetcher: async () => {
      const rows = await statsDelegate.findMany({
        take: safeLimit,
        orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
        select: { termDisplay: true },
      });

      return rows
        .map((row) => normalizeTerm(row.termDisplay))
        .filter((term): term is string => Boolean(term));
    },
  });
}

export async function recordSearchTerm(rawTerm: string) {
  const normalizedTerm = normalizeTerm(rawTerm);
  if (!normalizedTerm) {
    return { ok: false, reason: "INVALID_TERM" } as const;
  }

  const normalizedKey = normalizedTerm.toLowerCase();
  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  await statsDelegate.upsert({
    where: { termNormalized: normalizedKey },
    update: {
      termDisplay: normalizedTerm,
      count: { increment: 1 },
    },
    create: {
      termNormalized: normalizedKey,
      termDisplay: normalizedTerm,
      count: 1,
    },
  });

  void bumpPopularCacheVersion().catch(() => undefined);

  return { ok: true } as const;
}
