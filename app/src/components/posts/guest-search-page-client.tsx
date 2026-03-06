"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PostType } from "@prisma/client";

import { HighlightText } from "@/components/content/highlight-text";
import { FeedSearchForm } from "@/components/posts/feed-search-form";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeDate, postTypeMeta } from "@/lib/post-presenter";

type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";

type GuestSearchPostItem = {
  id: string;
  type: PostType;
  title: string;
  content: string;
  commentCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    nickname: string | null;
  };
};

type GuestSearchResponse =
  | {
      ok: true;
      data: {
        query: string;
        type: PostType | null;
        searchIn: FeedSearchIn;
        isGuestTypeBlocked: boolean;
        popularTerms: string[];
        items: GuestSearchPostItem[];
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

const DEFAULT_DATA = {
  query: "",
  type: null as PostType | null,
  searchIn: "ALL" as FeedSearchIn,
  isGuestTypeBlocked: false,
  popularTerms: [] as string[],
  items: [] as GuestSearchPostItem[],
};

export function GuestSearchPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const queryString = searchParams.toString();

  useEffect(() => {
    if (!pathname?.startsWith("/search")) {
      return;
    }

    if (!searchParams.get("scope")) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("scope");
    const serialized = params.toString();
    router.replace(serialized ? `/search?${serialized}` : "/search");
  }, [pathname, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(
          `/api/search/guest${queryString ? `?${queryString}` : ""}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "force-cache",
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as GuestSearchResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "검색 결과를 불러오지 못했습니다." : payload.error.message);
        }

        setData(payload.data);
      } catch (error) {
        if (cancelled || (error as { name?: string }).name === "AbortError") {
          return;
        }

        setLoadError(
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "검색 결과를 불러오지 못했습니다.",
        );
        setData((current) => ({
          ...current,
          items: [],
        }));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryString]);

  const query = data.query;
  const type = data.type;
  const popularTerms = data.popularTerms;
  const selectedSearchIn = data.searchIn;
  const items = data.items;
  const isGuestTypeBlocked = data.isGuestTypeBlocked;
  const hasQuery = query.trim().length > 0;

  const blockedLoginHref = useMemo(() => {
    if (!type) {
      return "/login?next=%2Fsearch";
    }
    return `/login?next=${encodeURIComponent(`/search?type=${type}`)}`;
  }, [type]);

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">검색</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-4xl">
            게시글 검색
          </h1>
          <p className="mt-2 text-sm text-[#4f678d] sm:text-base">
            제목, 내용, 작성자 기준으로 원하는 글을 빠르게 찾을 수 있습니다.
          </p>
          <div className="mt-4">
            <FeedSearchForm
              actionPath="/search"
              query={query}
              searchIn={selectedSearchIn}
              personalized="0"
              type={type ?? undefined}
              mode="ALL"
              days={7}
              sort="LATEST"
              resetHref="/search"
              popularTerms={popularTerms}
            />
          </div>
        </header>

        {isGuestTypeBlocked && type ? (
          <div className="border border-[#d9c38b] bg-[#fff8e5] px-4 py-3 text-sm text-[#6c5319]">
            선택한 카테고리({postTypeMeta[type].label})는 로그인 후 검색할 수 있습니다.{" "}
            <Link
              href={blockedLoginHref}
              className="font-semibold text-[#2f5da4] underline underline-offset-2"
            >
              로그인하기
            </Link>
          </div>
        ) : null}

        {loadError ? (
          <section className="tp-card overflow-hidden">
            <EmptyState title="검색 결과를 불러오지 못했습니다" description={loadError} />
          </section>
        ) : isLoading && hasQuery ? (
          <section className="tp-card overflow-hidden">
            <EmptyState title="검색 중입니다" description="검색 결과를 불러오고 있습니다." />
          </section>
        ) : !hasQuery ? (
          <section className="tp-card overflow-hidden">
            <EmptyState
              title="검색어를 입력해 주세요"
              description="최소 2글자 이상 입력하면 자동완성과 최근/인기 검색어를 활용할 수 있습니다."
            />
          </section>
        ) : items.length === 0 ? (
          <section className="tp-card overflow-hidden">
            <EmptyState
              title="검색 결과가 없습니다"
              description="검색 범위를 바꾸거나 인기 검색어를 선택해 다시 시도해 보세요."
            />
          </section>
        ) : (
          <section className="tp-card overflow-hidden">
            <div className="border-b border-[#dbe6f6] px-4 py-3 text-sm text-[#4f678d] sm:px-5">
              검색어 <span className="font-semibold text-[#1f3f71]">&quot;{query}&quot;</span> ·{" "}
              결과 {items.length}건
            </div>
            <div className="divide-y divide-[#e4edf9]">
              {items.map((post) => (
                <article key={post.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#59739b]">
                    <span className="font-semibold text-[#1f4f8f]">
                      {postTypeMeta[post.type].label}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeDate(post.createdAt)}</span>
                    <span>•</span>
                    <span>{post.author.nickname ?? post.author.name ?? "익명"}</span>
                  </div>
                  <Link href={`/posts/${post.id}/guest`} className="mt-2 block">
                    <h2 className="text-base font-semibold text-[#12315c] sm:text-lg">
                      <HighlightText text={post.title} query={query} />
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#4f678d]">
                      <HighlightText text={post.content} query={query} />
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
