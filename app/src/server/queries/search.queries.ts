import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";

const POPULAR_SEARCH_TERMS_KEY = "popular_search_terms_v1";
const MAX_TRACKED_TERMS = 200;

type SearchTermEntry = {
  term: string;
  count: number;
  updatedAt: string;
};

type SiteSettingRecord = {
  value: unknown;
};

type SiteSettingDelegate = {
  findUnique(args: {
    where: { key: string };
    select: { value: true };
  }): Promise<SiteSettingRecord | null>;
  upsert(args: {
    where: { key: string };
    update: { value: SearchTermEntry[] };
    create: { key: string; value: SearchTermEntry[] };
  }): Promise<unknown>;
};

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
let missingSiteSettingDelegateWarned = false;

function getSearchTermStatDelegate() {
  const delegate = (
    prisma as unknown as { searchTermStat?: SearchTermStatDelegate }
  ).searchTermStat;

  if (!delegate && !missingSearchTermStatDelegateWarned) {
    missingSearchTermStatDelegateWarned = true;
    logger.warn(
      "Prisma Client에 SearchTermStat 모델이 없어 검색 통계를 구형 SiteSetting 방식으로 fallback합니다.",
    );
  }

  return delegate ?? null;
}

function getSiteSettingDelegate() {
  const delegate = (
    prisma as unknown as { siteSetting?: SiteSettingDelegate }
  ).siteSetting;

  if (!delegate && !missingSiteSettingDelegateWarned) {
    missingSiteSettingDelegateWarned = true;
    logger.warn(
      "Prisma Client에 SiteSetting 모델이 없어 구형 검색 통계 fallback을 사용할 수 없습니다.",
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

function toSearchTermEntries(value: unknown): SearchTermEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: SearchTermEntry[] = [];
  const seen = new Set<string>();

  for (const rawItem of value) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const item = rawItem as Partial<SearchTermEntry>;
    if (typeof item.term !== "string") {
      continue;
    }
    const normalizedTerm = normalizeTerm(item.term);
    if (!normalizedTerm) {
      continue;
    }

    const key = normalizedTerm.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    const count = Number.isFinite(item.count) ? Number(item.count) : 0;
    const safeCount = Math.max(0, Math.floor(count));
    if (safeCount < 1) {
      continue;
    }

    const updatedAt =
      typeof item.updatedAt === "string" &&
      Number.isFinite(Date.parse(item.updatedAt))
        ? item.updatedAt
        : new Date(0).toISOString();

    seen.add(key);
    entries.push({
      term: normalizedTerm,
      count: safeCount,
      updatedAt,
    });
  }

  return entries.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

export async function getPopularSearchTerms(limit = 8) {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const statsDelegate = getSearchTermStatDelegate();
  if (statsDelegate) {
    const rows = await statsDelegate.findMany({
      take: safeLimit,
      orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
      select: { termDisplay: true },
    });
    return rows
      .map((row) => normalizeTerm(row.termDisplay))
      .filter((term): term is string => Boolean(term));
  }

  const fallbackDelegate = getSiteSettingDelegate();
  if (!fallbackDelegate) {
    return [] as string[];
  }

  // Backward compatibility for unsynced environments.
  const setting = await fallbackDelegate.findUnique({
    where: { key: POPULAR_SEARCH_TERMS_KEY },
    select: { value: true },
  });

  return toSearchTermEntries(setting?.value)
    .slice(0, safeLimit)
    .map((item) => item.term);
}

export async function recordSearchTerm(rawTerm: string) {
  const normalizedTerm = normalizeTerm(rawTerm);
  if (!normalizedTerm) {
    return { ok: false, reason: "INVALID_TERM" } as const;
  }

  const normalizedKey = normalizedTerm.toLowerCase();
  const statsDelegate = getSearchTermStatDelegate();
  if (statsDelegate) {
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

    return { ok: true } as const;
  }

  const fallbackDelegate = getSiteSettingDelegate();
  if (!fallbackDelegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  // Backward compatibility for unsynced environments.
  const setting = await fallbackDelegate.findUnique({
    where: { key: POPULAR_SEARCH_TERMS_KEY },
    select: { value: true },
  });
  const current = toSearchTermEntries(setting?.value);
  const nowIso = new Date().toISOString();
  const targetKey = normalizedTerm.toLowerCase();

  let found = false;
  const next = current.map((item) => {
    if (item.term.toLowerCase() !== targetKey) {
      return item;
    }
    found = true;
    return {
      term: item.term,
      count: item.count + 1,
      updatedAt: nowIso,
    };
  });

  if (!found) {
    next.push({
      term: normalizedTerm,
      count: 1,
      updatedAt: nowIso,
    });
  }

  next.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });

  await fallbackDelegate.upsert({
    where: { key: POPULAR_SEARCH_TERMS_KEY },
    update: { value: next.slice(0, MAX_TRACKED_TERMS) },
    create: {
      key: POPULAR_SEARCH_TERMS_KEY,
      value: next.slice(0, MAX_TRACKED_TERMS),
    },
  });

  return { ok: true } as const;
}
