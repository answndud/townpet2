import Link from "next/link";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostReactionControls } from "@/components/posts/post-reaction-controls";
import { auth } from "@/lib/auth";
import { formatCount, formatRelativeDate, postTypeMeta } from "@/lib/post-presenter";
import { listBestPosts } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

type BestPageProps = {
  searchParams?: Promise<{
    type?: string;
    scope?: string;
    days?: string;
    limit?: string;
  }>;
};

const BEST_DAY_OPTIONS = [3, 7, 30] as const;
type BestDay = (typeof BEST_DAY_OPTIONS)[number];

function toPostType(value?: string): PostType | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(PostType).includes(value as PostType)
    ? (value as PostType)
    : undefined;
}

function toScope(value?: string): PostScope | undefined {
  if (value === PostScope.LOCAL || value === PostScope.GLOBAL) {
    return value;
  }
  return undefined;
}

function toBestDay(value?: string): BestDay {
  const numeric = Number(value);
  return BEST_DAY_OPTIONS.includes(numeric as BestDay)
    ? (numeric as BestDay)
    : 7;
}

function toLimit(value?: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 30;
  }

  return Math.min(Math.max(Math.trunc(numeric), 1), 50);
}

export default async function BestPage({ searchParams }: BestPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const user = await getUserWithNeighborhoods(userId);
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = (await searchParams) ?? {};
  const type = toPostType(resolvedParams.type);
  const scope = toScope(resolvedParams.scope);
  const selectedScope = scope ?? PostScope.LOCAL;
  const days = toBestDay(resolvedParams.days);
  const limit = toLimit(resolvedParams.limit);

  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);
  if (!primaryNeighborhood && selectedScope !== PostScope.GLOBAL) {
    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="동네를 설정해야 동네 베스트를 볼 수 있습니다."
        secondaryLink="/best?scope=GLOBAL"
        secondaryLabel="온동네 베스트 보기"
      />
    );
  }

  const items = await listBestPosts({
    limit,
    days,
    type,
    scope: selectedScope,
    neighborhoodId:
      selectedScope === PostScope.LOCAL
        ? primaryNeighborhood?.neighborhood.id
        : undefined,
    minLikes: 1,
    viewerId: user.id,
  });

  const makeHref = ({
    nextType,
    nextScope,
    nextDays,
  }: {
    nextType?: PostType | null;
    nextScope?: PostScope | null;
    nextDays?: BestDay | null;
  }) => {
    const params = new URLSearchParams();
    const resolvedType = nextType === undefined ? type : nextType;
    const resolvedScope = nextScope === undefined ? selectedScope : nextScope;
    const resolvedDays = nextDays === undefined ? days : nextDays;

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedScope) params.set("scope", resolvedScope);
    if (resolvedDays) params.set("days", String(resolvedDays));
    if (limit !== 30) params.set("limit", String(limit));

    const serialized = params.toString();
    return serialized ? `/best?${serialized}` : "/best";
  };

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="animate-float-in border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">
                타운펫 베스트
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-4xl">
                좋아요 베스트 게시판
              </h1>
              <p className="mt-2 text-sm text-[#4f678d] sm:text-base">
                최근 기간 내 좋아요 1개 이상 받은 게시글만 모아 보여줍니다.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-[#4f678d]">
              <div className="border border-[#d4e1f3] bg-white px-3 py-1.5">
                베스트 글 {items.length}건
              </div>
              <Link
                href="/feed"
                className="inline-flex h-10 items-center justify-center border border-[#3567b5] bg-[#3567b5] px-4 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
              >
                일반 피드로 이동
              </Link>
            </div>
          </div>
        </header>

        <section className="animate-fade-up border border-[#c8d7ef] bg-white p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <div className="border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  카테고리
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={selectedScope === PostScope.GLOBAL ? "/feed?scope=GLOBAL" : "/feed"}
                    className="border border-[#b9cbeb] bg-white px-3 py-1 text-xs font-medium text-[#2f548f] transition hover:bg-[#f3f7ff]"
                  >
                    일반 피드
                  </Link>
                  <Link
                    href={makeHref({ nextType: null })}
                    className={`border px-3 py-1 text-xs font-medium transition ${
                      !type
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                    }`}
                  >
                    전체
                  </Link>
                  {Object.values(PostType).map((value) => (
                    <Link
                      key={value}
                      href={makeHref({ nextType: value })}
                      className={`border px-3 py-1 text-xs font-medium transition ${
                        type === value
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                      }`}
                    >
                      {postTypeMeta[value].label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <aside className="border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                범위
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href={makeHref({ nextScope: PostScope.LOCAL })}
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    selectedScope === PostScope.LOCAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  동네
                </Link>
                <Link
                  href={makeHref({ nextScope: PostScope.GLOBAL })}
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    selectedScope === PostScope.GLOBAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  온동네
                </Link>
              </div>
              <div className="mt-3 border-t border-[#dbe6f6] pt-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  기간
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BEST_DAY_OPTIONS.map((day) => (
                    <Link
                      key={day}
                      href={makeHref({ nextDays: day })}
                      className={`border px-2 py-2 text-center text-xs font-semibold transition ${
                        days === day
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                      }`}
                    >
                      최근 {day}일
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="animate-fade-up border border-[#c8d7ef] bg-white">
          {items.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h2 className="text-lg font-semibold text-[#1d3660]">베스트 조건에 맞는 글이 없습니다</h2>
              <p className="mt-2 text-sm text-[#5a7397]">
                좋아요가 1개 이상인 글이 쌓이면 자동으로 이곳에 노출됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e1e9f5]">
              {items.map((post, index) => {
                const meta = postTypeMeta[post.type];
                const excerpt =
                  post.content.length > 120
                    ? `${post.content.slice(0, 120)}...`
                    : post.content;

                return (
                  <article
                    key={post.id}
                    className={`grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[44px_minmax(0,1fr)_240px] md:items-center ${
                      post.status === "HIDDEN" ? "bg-[#fff5f5]" : ""
                    }`}
                  >
                    <div className="border border-[#a9c0e4] bg-[#f0f5ff] px-2 py-2 text-center text-sm font-bold text-[#20447a]">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
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
                        {post.status === "HIDDEN" ? (
                          <span className="border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-700">
                            숨김
                          </span>
                        ) : null}
                      </div>
                      <Link
                        href={`/posts/${post.id}`}
                        className="block truncate text-base font-semibold text-[#10284a] transition hover:text-[#2f5da4] sm:text-lg"
                      >
                        {post.title}
                        {post.commentCount > 0 ? ` [${post.commentCount}]` : ""}
                      </Link>
                      <p className="mt-1 truncate text-sm text-[#4c6488]">{excerpt}</p>
                    </div>
                    <div className="text-xs text-[#4f678d] md:text-right">
                      <p className="font-semibold text-[#1f3f71]">
                        {post.author.nickname ?? post.author.name ?? "익명"}
                      </p>
                      <p className="mt-0.5">{formatRelativeDate(post.createdAt)}</p>
                      <p className="mt-2 text-[11px] text-[#6a84ab]">
                        좋아요 {formatCount(post.likeCount)} · 싫어요 {formatCount(post.dislikeCount)} · 댓글{" "}
                        {formatCount(post.commentCount)} · 조회 {formatCount(post.viewCount)}
                      </p>
                      <div className="mt-2 md:ml-auto md:flex md:justify-end">
                        <PostReactionControls
                          postId={post.id}
                          likeCount={post.likeCount}
                          dislikeCount={post.dislikeCount}
                          currentReaction={post.reactions[0]?.type ?? null}
                          compact
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
