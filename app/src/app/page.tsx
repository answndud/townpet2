import Link from "next/link";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { auth } from "@/lib/auth";
import { postListSchema } from "@/lib/validations/post";
import { listPosts } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

type HomePageProps = {
  searchParams?: Promise<{
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    q?: string;
  }>;
};

const typeMeta: Record<
  PostType,
  { label: string; chipClass: string; icon: string }
> = {
  HOSPITAL_REVIEW: {
    label: "병원",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "H",
  },
  PLACE_REVIEW: {
    label: "장소",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "P",
  },
  WALK_ROUTE: {
    label: "산책",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    icon: "W",
  },
  MEETUP: {
    label: "번개",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: "M",
  },
  MARKET_LISTING: {
    label: "마켓",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
    icon: "K",
  },
  LOST_FOUND: {
    label: "실종",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "L",
  },
  QA_QUESTION: {
    label: "Q&A",
    chipClass: "border-teal-200 bg-teal-50 text-teal-700",
    icon: "Q",
  },
  QA_ANSWER: {
    label: "답변",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    icon: "A",
  },
  FREE_POST: {
    label: "자유",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    icon: "F",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    icon: "B",
  },
  DAILY_SHARE: {
    label: "일상공유",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
    icon: "D",
  },
  PRODUCT_REVIEW: {
    label: "제품리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "R",
  },
  PET_SHOWCASE: {
    label: "반려동물 자랑",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "S",
  },
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

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function Home({ searchParams }: HomePageProps) {
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
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const type = parsedParams.success ? parsedParams.data.type : undefined;
  const scope = parsedParams.success ? parsedParams.data.scope : undefined;
  const effectiveScope = scope ?? PostScope.LOCAL;

  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);
  if (!primaryNeighborhood && effectiveScope !== PostScope.GLOBAL) {
    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="동네를 설정해야 로컬 피드를 확인할 수 있습니다."
        secondaryLink="/?scope=GLOBAL"
        secondaryLabel="온동네 피드 보기"
      />
    );
  }

  const cursor = parsedParams.success ? parsedParams.data.cursor : undefined;
  const limit = parsedParams.success ? parsedParams.data.limit : 20;
  const query = parsedParams.success ? parsedParams.data.q?.trim() ?? "" : "";

  const posts = await listPosts({
    limit,
    cursor,
    type,
    scope: effectiveScope,
    q: query || undefined,
    neighborhoodId:
      effectiveScope === PostScope.LOCAL
        ? primaryNeighborhood?.neighborhood.id
        : undefined,
  });

  const items = posts.items;
  const selectedScope = scope ?? PostScope.LOCAL;
  const localCount = items.filter((post) => post.scope === PostScope.LOCAL).length;

  const makeHref = ({
    nextType,
    nextScope,
    nextQuery,
    nextCursor,
  }: {
    nextType?: PostType | null;
    nextScope?: PostScope | null;
    nextQuery?: string | null;
    nextCursor?: string | null;
  }) => {
    const params = new URLSearchParams();
    const resolvedType = nextType === undefined ? type : nextType;
    const resolvedScope = nextScope === undefined ? selectedScope : nextScope;
    const resolvedQuery = nextQuery === undefined ? query : nextQuery;

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedScope) params.set("scope", resolvedScope);
    if (resolvedQuery) params.set("q", resolvedQuery);
    if (limit) params.set("limit", String(limit));
    if (nextCursor) params.set("cursor", nextCursor);

    const serialized = params.toString();
    return serialized ? `/?${serialized}` : "/";
  };

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="animate-float-in border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">
                타운펫 커뮤니티
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-4xl">
                동네 반려동물 게시판
              </h1>
              <p className="mt-2 text-sm text-[#4f678d] sm:text-base">
                카테고리와 범위를 빠르게 조합해 필요한 글을 즉시 찾을 수 있습니다.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-[#4f678d]">
              <div className="border border-[#d4e1f3] bg-white px-3 py-1.5">
                현재 글 {items.length}건
              </div>
              <Link
                href="/posts/new"
                className="inline-flex h-10 items-center justify-center border border-[#3567b5] bg-[#3567b5] px-4 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
              >
                글쓰기
              </Link>
            </div>
          </div>
        </header>

        <section className="animate-fade-up border border-[#c8d7ef] bg-white p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
              <form action="/" className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {type ? <input type="hidden" name="type" value={type} /> : null}
                {selectedScope ? (
                  <input type="hidden" name="scope" value={selectedScope} />
                ) : null}
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="제목, 내용 검색"
                  className="h-10 w-full border border-[#b9cbeb] bg-white px-3 text-sm text-[#122748] outline-none transition focus:border-[#4a78be]"
                />
                <button
                  type="submit"
                  className="h-10 min-w-[76px] border border-[#3567b5] bg-[#3567b5] px-3 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
                >
                  검색
                </button>
                {query ? (
                  <Link
                    href={makeHref({ nextQuery: null, nextCursor: null })}
                    className="inline-flex h-10 min-w-[76px] items-center justify-center border border-[#b9cbeb] bg-white px-3 text-sm font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff]"
                  >
                    초기화
                  </Link>
                ) : null}
              </form>

              <div className="border border-[#dbe6f6] bg-[#f8fbff] p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  카테고리
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={makeHref({ nextType: null, nextCursor: null })}
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
                      href={makeHref({ nextType: value, nextCursor: null })}
                      className={`border px-3 py-1 text-xs font-medium transition ${
                        type === value
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                      }`}
                    >
                      {typeMeta[value].label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <aside className="border border-[#dbe6f6] bg-[#f8fbff] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                범위
              </div>
              <div className="mt-2 grid gap-2">
                <Link
                  href={makeHref({ nextScope: PostScope.LOCAL, nextCursor: null })}
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    selectedScope === PostScope.LOCAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  동네
                </Link>
                <Link
                  href={makeHref({ nextScope: PostScope.GLOBAL, nextCursor: null })}
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    selectedScope === PostScope.GLOBAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  온동네
                </Link>
              </div>
              <div className="mt-3 border-t border-[#dbe6f6] pt-3 text-xs text-[#4f678d]">
                동네 글 {localCount}건 · 온동네 글 {items.length - localCount}건
              </div>
            </aside>
          </div>
        </section>

        <section className="animate-fade-up border border-[#c8d7ef] bg-white">
          {items.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h2 className="text-lg font-semibold text-[#1d3660]">게시글이 없습니다</h2>
              <p className="mt-2 text-sm text-[#5a7397]">
                글을 작성하거나 온동네 범위로 전환해서 다른 지역 글을 확인해 주세요.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e1e9f5]">
              {items.map((post) => {
                const meta = typeMeta[post.type];
                const excerpt =
                  post.content.length > 120
                    ? `${post.content.slice(0, 120)}...`
                    : post.content;

                return (
                  <article
                    key={post.id}
                    className={`grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center ${
                      post.status === "HIDDEN" ? "bg-[#fff5f5]" : ""
                    }`}
                  >
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
                        조회 {formatCount(post.viewCount)} · 좋아요 {formatCount(post.likeCount)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {posts.nextCursor ? (
            <div className="border-t border-[#d8e3f2] px-4 py-4 text-center">
              <Link
                href={makeHref({ nextCursor: posts.nextCursor })}
                className="inline-flex h-10 items-center justify-center border border-[#b9cbeb] bg-white px-4 text-sm font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff]"
              >
                더 보기
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
