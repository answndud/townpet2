import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostType } from "@prisma/client";

import { PostSignalIcons } from "@/components/posts/post-signal-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { getPostSignals } from "@/lib/post-presenter";
import { PRIMARY_POST_TYPES, SECONDARY_POST_TYPES } from "@/lib/post-type-groups";
import { resolveUserDisplayName } from "@/lib/user-display";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { listUserBookmarkedPostsPage } from "@/server/queries/post.queries";

type BookmarksPageProps = {
  searchParams?: Promise<{
    type?: PostType;
    q?: string;
    page?: string;
  }>;
};

const BOOKMARKS_PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: "북마크",
  description: "내가 북마크한 게시글을 다시 확인합니다.",
  alternates: {
    canonical: "/bookmarks",
  },
  robots: {
    index: false,
    follow: false,
  },
};

const typeLabels: Record<PostType, string> = {
  HOSPITAL_REVIEW: "병원후기",
  PLACE_REVIEW: "후기/리뷰",
  WALK_ROUTE: "동네 산책코스",
  MEETUP: "동네모임",
  MARKET_LISTING: "중고/공동구매",
  ADOPTION_LISTING: "유기동물 입양",
  SHELTER_VOLUNTEER: "보호소 봉사 모집",
  LOST_FOUND: "실종/목격 제보",
  QA_QUESTION: "질문/답변",
  QA_ANSWER: "질문/답변",
  FREE_POST: "자유게시판",
  FREE_BOARD: "자유게시판",
  DAILY_SHARE: "자유게시판",
  PRODUCT_REVIEW: "용품리뷰",
  PET_SHOWCASE: "반려동물 자랑",
};

function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString("ko-KR");
}

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: session.user?.nickname,
  });

  const resolvedParams = (await searchParams) ?? {};
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const type = listInput?.type;
  const requestedPage = Number.parseInt(
    typeof resolvedParams.page === "string" ? resolvedParams.page : "1",
    10,
  );
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = listInput?.q?.trim() ?? "";

  const { items: posts, hasNext } = await listUserBookmarkedPostsPage({
    userId,
    type,
    q: query || undefined,
    limit: BOOKMARKS_PAGE_SIZE,
    page: currentPage,
  });

  const makeHref = ({
    nextType,
    nextQuery,
    nextPage,
  }: {
    nextType?: PostType | null;
    nextQuery?: string | null;
    nextPage?: number | null;
  }) => {
    const params = new URLSearchParams();
    const resolvedType = nextType === undefined ? type : nextType;
    const resolvedQuery = nextQuery === undefined ? query : nextQuery;
    const isTypeChanged = nextType !== undefined && nextType !== type;
    const isQueryChanged = nextQuery !== undefined && nextQuery !== query;
    const resolvedPage =
      nextPage === undefined ? (isTypeChanged || isQueryChanged ? 1 : currentPage) : nextPage;

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedQuery) params.set("q", resolvedQuery);
    if (resolvedPage && resolvedPage > 1) {
      params.set("page", String(resolvedPage));
    }

    const serialized = params.toString();
    return serialized ? `/bookmarks?${serialized}` : "/bookmarks";
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">북마크</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            북마크한 게시글
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            게시글 상세에서 북마크한 글을 한곳에서 모아 확인할 수 있습니다.
          </p>
        </header>

        <section className="tp-card p-4 sm:p-5">
          <div className="space-y-3">
            <form action="/bookmarks" className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {type ? <input type="hidden" name="type" value={type} /> : null}
              <input
                name="q"
                defaultValue={query}
                placeholder="제목, 내용 검색"
                className="tp-input-soft h-10 w-full bg-white px-4 text-sm outline-none transition focus:border-[#4e89d8]"
              />
              <button
                type="submit"
                className="tp-btn-primary h-10 min-w-[76px] px-3 text-sm font-semibold"
              >
                검색
              </button>
              {query ? (
                <Link
                  href={makeHref({ nextQuery: null })}
                  className="tp-btn-soft inline-flex h-10 min-w-[76px] items-center justify-center px-3 text-sm font-semibold"
                >
                  초기화
                </Link>
              ) : null}
            </form>

            <div className="tp-soft-card p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                주요 게시판
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={makeHref({ nextType: null })}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                    !type
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                  }`}
                >
                  전체
                </Link>
                {PRIMARY_POST_TYPES.map((value) => (
                  <Link
                    key={value}
                    href={makeHref({ nextType: value })}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                      type === value
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                    }`}
                  >
                    {typeLabels[value]}
                  </Link>
                ))}
              </div>
              <div className="mt-3 border-t border-[#dbe6f6] pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  추가 게시판
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {SECONDARY_POST_TYPES.map((value) => (
                    <Link
                      key={value}
                      href={makeHref({ nextType: value })}
                      className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                        type === value
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                      }`}
                    >
                      {typeLabels[value]}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <p className="border-t border-[#dbe6f6] pt-3 text-xs text-[#4f678d]">
              페이지 {currentPage} · 현재 {posts.length}건 표시
            </p>
          </div>
        </section>

        <section className="tp-card overflow-hidden">
          {posts.length === 0 ? (
            <EmptyState
              title="북마크한 글이 없습니다"
              description="게시글 상세에서 북마크 버튼을 눌러 나중에 다시 볼 글을 모아보세요."
              actionHref="/feed"
              actionLabel="피드로 이동"
            />
          ) : (
            <div className="divide-y divide-[#e1e9f5]">
              {posts.map((post) => {
                const signals = getPostSignals({
                  title: post.title,
                  content: post.content,
                  imageCount: post.images.length,
                });

                return (
                  <article
                    key={post.id}
                    className={`grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_240px] md:items-center ${
                      post.status === "HIDDEN" ? "bg-[#fff5f5]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="border border-[#d2ddf0] bg-[#f6f9ff] px-2 py-0.5 text-[#2f548f]">
                          {typeLabels[post.type]}
                        </span>
                        <span className="border border-[#dbe5f3] bg-white px-2 py-0.5 text-[#5d789f]">
                          {post.neighborhood
                            ? `${post.neighborhood.city} ${post.neighborhood.name}`
                            : "전체"}
                        </span>
                        {post.status === "HIDDEN" ? (
                          <span className="border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-700">
                            숨김
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href={`/posts/${post.id}`}
                        className="flex min-w-0 items-center gap-1 text-base font-semibold text-[#10284a] transition hover:text-[#2f5da4] sm:text-lg"
                      >
                        <span className="truncate">{post.title}</span>
                        <PostSignalIcons signals={signals} />
                        {post.commentCount > 0 ? (
                          <span className="shrink-0 text-[#2f5da4]">[{post.commentCount}]</span>
                        ) : null}
                      </Link>
                      <p className="mt-1 truncate text-sm text-[#4c6488]">
                        {post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content}
                      </p>
                    </div>

                    <div className="text-xs text-[#4f678d] md:text-right">
                      <p className="font-semibold text-[#1f3f71]">
                        {resolveUserDisplayName(post.author.nickname)}
                      </p>
                      <p className="mt-1">북마크 {formatRelativeDate(post.bookmarkedAt)}</p>
                      <p className="mt-1 text-[11px] text-[#6a84ab]">
                        작성 {formatRelativeDate(post.createdAt)} · 조회 {post.viewCount.toLocaleString()} · 좋아요{" "}
                        {post.likeCount.toLocaleString()}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {posts.length > 0 ? (
          <section className="flex items-center justify-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={makeHref({ nextPage: currentPage - 1 })}
                className="tp-btn-soft px-3 py-1.5 text-xs font-semibold text-[#315484]"
              >
                이전 페이지
              </Link>
            ) : null}
            <span className="text-xs text-[#4f678d]">{currentPage} 페이지</span>
            {hasNext ? (
              <Link
                href={makeHref({ nextPage: currentPage + 1 })}
                className="tp-btn-soft px-3 py-1.5 text-xs font-semibold text-[#315484]"
              >
                다음 페이지
              </Link>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
