import { prisma } from "@/lib/prisma";
import {
  normalizeSearchTerm,
  shouldExcludeSearchTermFromStats,
  type SearchTermSkipReason,
} from "@/lib/search-term-privacy";
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
let missingSearchTermStatTableWarned = false;

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

function isSearchTermStatSchemaSyncError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code !== undefined &&
    ((error as { code?: string }).code === "P2021" ||
      (error as { code?: string }).code === "P2022")
  );
}

function warnMissingSearchTermStatTable(error: unknown) {
  if (missingSearchTermStatTableWarned) {
    return;
  }

  missingSearchTermStatTableWarned = true;
  logger.warn("SearchTermStat 테이블/컬럼이 없어 검색 통계를 기록할 수 없습니다.", {
    error: error instanceof Error ? error.message : String(error),
  });
}

export type RecordSearchTermResult =
  | { ok: true; recorded: true }
  | { ok: true; recorded: false; reason: SearchTermSkipReason }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

function isTrackableSearchTerm(term: string) {
  return !shouldExcludeSearchTermFromStats(term);
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
      let rows: SearchTermStatRecord[];
      try {
        rows = await statsDelegate.findMany({
          take: safeLimit,
          orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
          select: { termDisplay: true },
        });
      } catch (error) {
        if (!isSearchTermStatSchemaSyncError(error)) {
          throw error;
        }
        warnMissingSearchTermStatTable(error);
        return [] as string[];
      }

      return rows
        .map((row) => normalizeSearchTerm(row.termDisplay))
        .filter((term): term is string => Boolean(term))
        .filter((term) => isTrackableSearchTerm(term));
    },
  });
}

export async function recordSearchTerm(rawTerm: string) {
  const normalizedTerm = normalizeSearchTerm(rawTerm);
  if (!normalizedTerm) {
    return { ok: true, recorded: false, reason: "INVALID_TERM" } as const;
  }

  if (!isTrackableSearchTerm(normalizedTerm)) {
    return { ok: true, recorded: false, reason: "SENSITIVE_TERM" } as const;
  }

  const normalizedKey = normalizedTerm.toLowerCase();
  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  try {
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
  } catch (error) {
    if (!isSearchTermStatSchemaSyncError(error)) {
      throw error;
    }
    warnMissingSearchTermStatTable(error);
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  void bumpPopularCacheVersion().catch(() => undefined);

  return { ok: true, recorded: true } as const;
}
