"use client";

import Link from "next/link";
import type { PostType } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedScope = "LOCAL" | "GLOBAL";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedPersonalized = "0" | "1";
type FeedDensity = "DEFAULT" | "ULTRA";

type FeedSearchFormProps = {
  actionPath: string;
  query: string;
  searchIn: FeedSearchIn;
  personalized: FeedPersonalized;
  type?: PostType;
  scope?: FeedScope;
  mode: FeedMode;
  days: number;
  period?: number | null;
  sort: FeedSort;
  resetHref: string;
  popularTerms?: string[];
  density?: FeedDensity;
  showKeywordChips?: boolean;
};

const SEARCH_OPTIONS: ReadonlyArray<{ value: FeedSearchIn; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "TITLE", label: "제목" },
  { value: "CONTENT", label: "내용" },
  { value: "AUTHOR", label: "작성자" },
];

type SuggestionResponse =
  | { ok: true; data: { items: string[] } }
  | { ok: false; error: { code: string; message: string } };

const RECENT_SEARCHES_KEY = "townpet:recent-searches:v1";
const MAX_RECENT_SEARCHES = 8;

function normalizeSearchTerm(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 100) {
    return null;
  }
  return normalized;
}

function parseRecentSearches(raw: string | null) {
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => normalizeSearchTerm(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function FeedSearchForm({
  actionPath,
  query,
  searchIn,
  personalized,
  type,
  scope,
  mode,
  days,
  period,
  sort,
  resetHref,
  popularTerms = [],
  density = "DEFAULT",
  showKeywordChips = true,
}: FeedSearchFormProps) {
  const [queryValue, setQueryValue] = useState(query);
  const [searchInValue, setSearchInValue] = useState<FeedSearchIn>(searchIn);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentTerms, setRecentTerms] = useState<string[]>([]);
  const [isKeywordPanelOpen, setIsKeywordPanelOpen] = useState(false);
  const shouldShowReset = query.length > 0;
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const datalistId = useMemo(
    () => `feed-search-suggestions-${mode.toLowerCase()}`,
    [mode],
  );

  useEffect(() => {
    setQueryValue(query);
  }, [query]);

  useEffect(() => {
    setSearchInValue(searchIn);
  }, [searchIn]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setRecentTerms(parseRecentSearches(window.localStorage.getItem(RECENT_SEARCHES_KEY)));
  }, []);

  const persistRecentSearchTerm = (rawValue: string) => {
    const term = normalizeSearchTerm(rawValue);
    if (!term || typeof window === "undefined") {
      return;
    }

    setRecentTerms((prev) => {
      const next = [term, ...prev.filter((item) => item !== term)].slice(
        0,
        MAX_RECENT_SEARCHES,
      );
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeRecentSearchTerm = (term: string) => {
    if (typeof window === "undefined") {
      return;
    }

    setRecentTerms((prev) => {
      const next = prev.filter((item) => item !== term);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const logSearchTerm = (rawValue: string) => {
    const term = normalizeSearchTerm(rawValue);
    if (!term || typeof window === "undefined") {
      return;
    }

    const payload = JSON.stringify({ q: term });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/search/log", blob);
      return;
    }

    void fetch("/api/search/log", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "same-origin",
      body: payload,
      keepalive: true,
    });
  };

  const buildTermHref = (term: string) => {
    const params = new URLSearchParams();
    if (type) {
      params.set("type", type);
    }
    if (scope) {
      params.set("scope", scope);
    }
    if (searchInValue !== "ALL") {
      params.set("searchIn", searchInValue);
    }
    if (mode === "ALL" && personalized === "1") {
      params.set("personalized", "1");
    }
    params.set("q", term);

    if (mode === "BEST") {
      params.set("mode", "BEST");
      params.set("days", String(days));
    } else if (sort !== "LATEST") {
      params.set("sort", sort);
      if (period) {
        params.set("period", String(period));
      }
    } else if (period) {
      params.set("period", String(period));
    }

    const serialized = params.toString();
    return serialized ? `${actionPath}?${serialized}` : actionPath;
  };

  useEffect(() => {
    const trimmed = queryValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("q", trimmed);
        params.set("limit", "8");
        params.set("searchIn", searchInValue);
        if (scope) {
          params.set("scope", scope);
        }
        if (type) {
          params.set("type", type);
        }

        const response = await fetch(`/api/posts/suggestions?${params.toString()}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as SuggestionResponse;
        if (!response.ok || !payload.ok) {
          setSuggestions([]);
          return;
        }

        setSuggestions(payload.data.items);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setSuggestions([]);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [queryValue, scope, searchInValue, type]);

  useEffect(() => {
    if (!isKeywordPanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        setIsKeywordPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isKeywordPanelOpen]);

  return (
    <div className={density === "ULTRA" ? "space-y-2" : "space-y-2.5"}>
      <div ref={searchBoxRef} className="relative">
        <form
          action={actionPath}
          onSubmit={() => {
            persistRecentSearchTerm(queryValue);
            logSearchTerm(queryValue);
            setIsKeywordPanelOpen(false);
          }}
          className={
            density === "ULTRA"
              ? "flex flex-col gap-1.5 sm:flex-row sm:items-center"
              : "flex flex-col gap-2 sm:flex-row sm:items-center"
          }
        >
        {type ? <input type="hidden" name="type" value={type} /> : null}
        {scope ? <input type="hidden" name="scope" value={scope} /> : null}
        {mode === "BEST" ? <input type="hidden" name="mode" value="BEST" /> : null}
        {mode === "BEST" ? <input type="hidden" name="days" value={String(days)} /> : null}
        {mode === "ALL" && sort !== "LATEST" ? <input type="hidden" name="sort" value={sort} /> : null}
        {mode === "ALL" && period ? <input type="hidden" name="period" value={String(period)} /> : null}
        {mode === "ALL" && personalized === "1" ? (
          <input type="hidden" name="personalized" value="1" />
        ) : null}

        <select
          name="searchIn"
          value={searchInValue}
          onChange={(event) => {
            setSearchInValue(event.target.value as FeedSearchIn);
          }}
          className={
            density === "ULTRA"
              ? "h-8 border border-[#b9cbeb] bg-white px-2 text-xs font-medium text-[#2f548f] outline-none transition focus:border-[#4a78be] focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
              : "h-9 border border-[#b9cbeb] bg-white px-2.5 text-sm text-[#2f548f] outline-none transition focus:border-[#4a78be]"
          }
        >
          {SEARCH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

          <input
            name="q"
            value={queryValue}
            onFocus={() => setIsKeywordPanelOpen(true)}
            onChange={(event) => {
              setQueryValue(event.target.value);
            }}
            placeholder="제목, 내용, 작성자 검색 (Enter)"
            list={datalistId}
            className={
              density === "ULTRA"
                ? "h-8 w-full border border-[#b9cbeb] bg-white px-2 text-xs text-[#122748] outline-none transition focus:border-[#4a78be] focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
                : "h-9 w-full border border-[#b9cbeb] bg-white px-2.5 text-sm text-[#122748] outline-none transition focus:border-[#4a78be]"
            }
          />
          <datalist id={datalistId}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>

          {shouldShowReset ? (
            <Link
              href={resetHref}
              className={
                density === "ULTRA"
                  ? "inline-flex h-8 min-w-[56px] items-center justify-center border border-[#b9cbeb] bg-white px-2 text-xs font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
                  : "inline-flex h-9 min-w-[68px] items-center justify-center border border-[#b9cbeb] bg-white px-2.5 text-sm font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff]"
              }
            >
              초기화
            </Link>
          ) : null}
        </form>

        {showKeywordChips && isKeywordPanelOpen && popularTerms.length > 0 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 hidden border border-[#bfd0ec] bg-white p-2 shadow-[0_10px_24px_rgba(16,40,74,0.12)] sm:block">
            <p className="px-1 pb-1 text-[11px] font-semibold text-[#5b7398]">인기 검색어 TOP 10</p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {popularTerms.slice(0, 10).map((term, index) => (
                <Link
                  key={`popular-${term}`}
                  href={buildTermHref(term)}
                  onClick={() => {
                    persistRecentSearchTerm(term);
                    logSearchTerm(term);
                    setIsKeywordPanelOpen(false);
                  }}
                  className="inline-flex items-center gap-2 border border-[#e0e9f7] bg-[#f8fbff] px-2 py-1 text-xs text-[#2f548f] transition hover:bg-white"
                >
                  <span className="inline-flex min-w-4 justify-center text-[11px] font-semibold text-[#1d64c4]">
                    {index + 1}
                  </span>
                  <span className="truncate">{term}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {showKeywordChips && recentTerms.length > 0 ? (
        <div className={density === "ULTRA" ? "hidden flex-wrap items-center gap-1 text-[11px] sm:flex" : "hidden flex-wrap items-center gap-1.5 text-xs sm:flex"}>
          <span className="text-[#5b7398]">최근 검색어</span>
          {recentTerms.map((term) => (
            <span
              key={`recent-${term}`}
              className={
                density === "ULTRA"
                  ? "inline-flex items-center border border-[#c4d4ed] bg-white"
                  : "inline-flex items-center border border-[#c4d4ed] bg-white"
              }
            >
              <Link
                href={buildTermHref(term)}
                onClick={() => {
                  persistRecentSearchTerm(term);
                  logSearchTerm(term);
                }}
                className={density === "ULTRA" ? "px-1.5 py-0.5 text-[#315484] transition hover:bg-[#f3f7ff]" : "px-2 py-0.5 text-[#315484] transition hover:bg-[#f3f7ff]"}
              >
                {term}
              </Link>
              <button
                type="button"
                onClick={() => removeRecentSearchTerm(term)}
                className={density === "ULTRA" ? "border-l border-[#d7e2f3] px-1 text-[10px] text-[#6e83a5] transition hover:bg-[#eef4ff] hover:text-[#2f548f]" : "border-l border-[#d7e2f3] px-1.5 text-[11px] text-[#6e83a5] transition hover:bg-[#eef4ff] hover:text-[#2f548f]"}
                aria-label={`최근 검색어 ${term} 삭제`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
