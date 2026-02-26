import Link from "next/link";
import type { Metadata } from "next";
import { PostScope, PostType } from "@prisma/client";

import { HighlightText } from "@/components/content/highlight-text";
import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { FeedSearchForm } from "@/components/posts/feed-search-form";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { formatRelativeDate, postTypeMeta } from "@/lib/post-presenter";
import { postListSchema } from "@/lib/validations/post";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listRankedSearchPosts } from "@/server/queries/post.queries";
import { getPopularSearchTerms } from "@/server/queries/search.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    searchIn?: string;
    limit?: string;
  }>;
};

export const metadata: Metadata = {
  title: "검색",
  description: "제목/내용/작성자 기준으로 게시글을 빠르게 찾으세요.",
  alternates: {
    canonical: "/search",
  },
  openGraph: {
    title: "TownPet 검색",
    description: "제목/내용/작성자 기준으로 게시글을 빠르게 찾으세요.",
    url: "/search",
  },
};

function toFeedSearchIn(value?: string): FeedSearchIn {
  if (value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return "ALL";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  const [user, loginRequiredTypes, popularSearchTerms] = await Promise.all([
    userId ? getUserWithNeighborhoods(userId) : Promise.resolve(null),
    getGuestReadLoginRequiredPostTypes(),
    getPopularSearchTerms(10),
  ]);
  const isAuthenticated = Boolean(user);
  const blockedTypesForGuest = !isAuthenticated ? loginRequiredTypes : [];

  const resolvedParams = (await searchParams) ?? {};
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const type = parsedParams.success ? parsedParams.data.type : undefined;
  const scope = parsedParams.success ? parsedParams.data.scope : undefined;
  const selectedScope = scope ?? PostScope.GLOBAL;
  const effectiveScope = isAuthenticated ? selectedScope : PostScope.GLOBAL;
  const query = parsedParams.success ? parsedParams.data.q?.trim() ?? "" : "";
  const selectedSearchIn = toFeedSearchIn(resolvedParams.searchIn);
  const isGuestTypeBlocked =
    !isAuthenticated && isLoginRequiredPostType(type, loginRequiredTypes);

  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  if (isAuthenticated && !primaryNeighborhood && effectiveScope !== PostScope.GLOBAL) {
    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="로컬 검색을 사용하려면 대표 동네를 설정해 주세요."
        secondaryLink="/search?scope=GLOBAL"
        secondaryLabel="온동네 검색 보기"
      />
    );
  }

  const neighborhoodId =
    effectiveScope === PostScope.LOCAL
      ? primaryNeighborhood?.neighborhood.id
      : undefined;

  const resultItems =
    query.length > 0 && !isGuestTypeBlocked
      ? await listRankedSearchPosts({
          limit: 30,
          scope: effectiveScope,
          type,
          q: query,
          searchIn: selectedSearchIn,
          excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
          neighborhoodId,
          viewerId: user?.id,
        })
      : [];

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
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
              type={type}
              scope={selectedScope}
              mode="ALL"
              days={7}
              sort="LATEST"
              resetHref="/search"
              popularTerms={popularSearchTerms}
            />
          </div>
        </header>

        {isGuestTypeBlocked && type ? (
          <div className="border border-[#d9c38b] bg-[#fff8e5] px-4 py-3 text-sm text-[#6c5319]">
            선택한 카테고리({postTypeMeta[type].label})는 로그인 후 검색할 수 있습니다.{" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/search?type=${type}`)}`}
              className="font-semibold text-[#2f5da4] underline underline-offset-2"
            >
              로그인하기
            </Link>
          </div>
        ) : null}

        {query.length === 0 ? (
          <section className="border border-[#c8d7ef] bg-white">
            <EmptyState
              title="검색어를 입력해 주세요"
              description="최소 2글자 이상 입력하면 자동완성과 최근/인기 검색어를 활용할 수 있습니다."
            />
          </section>
        ) : resultItems.length === 0 ? (
          <section className="border border-[#c8d7ef] bg-white">
            <EmptyState
              title="검색 결과가 없습니다"
              description="검색 범위를 바꾸거나 인기 검색어를 선택해 다시 시도해 보세요."
            />
          </section>
        ) : (
          <section className="border border-[#c8d7ef] bg-white">
            <div className="border-b border-[#dbe6f6] px-4 py-3 text-sm text-[#4f678d] sm:px-5">
              검색어 <span className="font-semibold text-[#1f3f71]">&quot;{query}&quot;</span> ·{" "}
              {resultItems.length}건
            </div>
            <div className="divide-y divide-[#e1e9f5]">
              {resultItems.map((post) => {
                const guestMeta = post as {
                  guestDisplayName?: string | null;
                  guestAuthor?: {
                    displayName?: string | null;
                    ipDisplay?: string | null;
                    ipLabel?: string | null;
                  } | null;
                  guestIpDisplay?: string | null;
                  guestIpLabel?: string | null;
                };
                const resolvedGuestIpDisplay =
                  guestMeta.guestIpDisplay ?? guestMeta.guestAuthor?.ipDisplay ?? null;
                const resolvedGuestIpLabel =
                  guestMeta.guestIpLabel ?? guestMeta.guestAuthor?.ipLabel ?? null;
                const meta = postTypeMeta[post.type];
                const excerpt =
                  post.content.length > 180
                    ? `${post.content.slice(0, 180)}...`
                    : post.content;
                return (
                  <article key={post.id} className="px-4 py-4 sm:px-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 border px-2 py-0.5 font-semibold ${meta.chipClass}`}
                      >
                        <span>{meta.icon}</span>
                        {meta.label}
                      </span>
                      <span className="border border-[#d2ddf0] bg-[#f6f9ff] px-2 py-0.5 text-[#2f548f]">
                        {post.scope === PostScope.LOCAL ? "동네" : "온동네"}
                      </span>
                      <span className="border border-[#dbe5f3] bg-white px-2 py-0.5 text-[#5d789f]">
                        {post.neighborhood
                          ? `${post.neighborhood.city} ${post.neighborhood.name}`
                          : "전체"}
                      </span>
                    </div>

                    <Link
                      href={`/posts/${post.id}`}
                      className="text-base font-semibold text-[#10284a] transition hover:text-[#2f5da4] sm:text-lg"
                    >
                      <HighlightText text={post.title} query={query} />
                    </Link>
                    <p className="mt-1 line-clamp-3 text-sm text-[#4c6488]">
                      <HighlightText text={excerpt} query={query} />
                    </p>
                    <div className="mt-2 text-xs text-[#5f79a0]">
                      {guestMeta.guestDisplayName || guestMeta.guestAuthor?.displayName ? (
                        <span>
                          {guestMeta.guestDisplayName ?? guestMeta.guestAuthor?.displayName}
                          {resolvedGuestIpDisplay
                            ? ` (${resolvedGuestIpLabel ?? "아이피"} ${resolvedGuestIpDisplay})`
                            : ""}
                        </span>
                      ) : (
                        <Link href={`/users/${post.author.id}`} className="hover:text-[#2f5da4]">
                          {post.author.nickname ?? post.author.name ?? "익명"}
                        </Link>
                      )}{" "}
                      ·{" "}
                      {formatRelativeDate(post.createdAt)} · 댓글 {post.commentCount}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
