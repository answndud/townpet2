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
    chipClass: "border-rose-200 bg-rose-100 text-rose-800",
    icon: "H",
  },
  PLACE_REVIEW: {
    label: "장소",
    chipClass: "border-blue-200 bg-blue-100 text-blue-800",
    icon: "P",
  },
  WALK_ROUTE: {
    label: "산책",
    chipClass: "border-emerald-200 bg-emerald-100 text-emerald-800",
    icon: "W",
  },
  MEETUP: {
    label: "번개",
    chipClass: "border-amber-200 bg-amber-100 text-amber-900",
    icon: "M",
  },
  MARKET_LISTING: {
    label: "마켓",
    chipClass: "border-orange-200 bg-orange-100 text-orange-900",
    icon: "K",
  },
  LOST_FOUND: {
    label: "실종",
    chipClass: "border-red-200 bg-red-100 text-red-800",
    icon: "L",
  },
  QA_QUESTION: {
    label: "Q&A",
    chipClass: "border-teal-200 bg-teal-100 text-teal-800",
    icon: "Q",
  },
  QA_ANSWER: {
    label: "답변",
    chipClass: "border-cyan-200 bg-cyan-100 text-cyan-800",
    icon: "A",
  },
  FREE_POST: {
    label: "자유",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-800",
    icon: "F",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-800",
    icon: "B",
  },
  DAILY_SHARE: {
    label: "일상공유",
    chipClass: "border-lime-200 bg-lime-100 text-lime-800",
    icon: "D",
  },
  PRODUCT_REVIEW: {
    label: "제품리뷰",
    chipClass: "border-sky-200 bg-sky-100 text-sky-800",
    icon: "R",
  },
  PET_SHOWCASE: {
    label: "내 반려동물 자랑",
    chipClass: "border-pink-200 bg-pink-100 text-pink-800",
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
  const globalCount = items.length - localCount;
  const hiddenCount = items.filter((post) => post.status === "HIDDEN").length;

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
      <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="animate-float-in relative overflow-hidden rounded-[28px] border border-[#d2e0d4] bg-[linear-gradient(135deg,#f7fff6,#edf8f2_45%,#e5f0ea)] p-5 shadow-[0_18px_40px_rgba(34,84,57,0.12)] sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,#9cd7ac_0%,rgba(156,215,172,0)_70%)]" />
          <div className="pointer-events-none absolute -bottom-28 left-14 h-56 w-56 rounded-full bg-[radial-gradient(circle,#bfdcc7_0%,rgba(191,220,199,0)_72%)]" />

          <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-[#3d7050]">
                  TownPet Community
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-[#102a1e] sm:text-4xl">
                  반려동물 커뮤니티 피드
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[#365b46] sm:text-base">
                  동네 지식, 후기, 질문을 빠르게 연결하는 커뮤니티 공간입니다.
                  화면 비율을 넓히고 카드 중심 피드로 바꿔 탐색 속도를 높였습니다.
                </p>
              </div>

              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
                action="/"
              >
                {type ? <input type="hidden" name="type" value={type} /> : null}
                {selectedScope ? (
                  <input type="hidden" name="scope" value={selectedScope} />
                ) : null}
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="제목, 내용, 키워드로 검색"
                  className="h-12 w-full rounded-2xl border border-[#c1d7c7] bg-white/90 px-4 text-sm shadow-[inset_0_1px_0_rgba(16,42,30,0.04)] outline-none transition focus:border-[#5b9a76] focus:ring-4 focus:ring-[#8ac7a140]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="h-12 min-w-[84px] rounded-2xl bg-[#1f6c45] px-4 text-sm font-semibold text-white transition hover:bg-[#185235]"
                  >
                    검색
                  </button>
                  {query ? (
                    <Link
                      href={makeHref({ nextQuery: null })}
                      className="inline-flex h-12 min-w-[84px] items-center justify-center rounded-2xl border border-[#c1d7c7] bg-white px-4 text-sm font-semibold text-[#1f6c45] transition hover:bg-[#f1faf4]"
                    >
                      초기화
                    </Link>
                  ) : null}
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#4f7b63]">
                    피드 범위
                  </span>
                  <Link
                    href={makeHref({ nextScope: PostScope.LOCAL, nextCursor: null })}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      selectedScope === PostScope.LOCAL
                        ? "border-[#1f6c45] bg-[#1f6c45] text-white"
                        : "border-[#b6cfbe] bg-white/90 text-[#29553f] hover:bg-[#eff8f2]"
                    }`}
                  >
                    동네
                  </Link>
                  <Link
                    href={makeHref({ nextScope: PostScope.GLOBAL, nextCursor: null })}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      selectedScope === PostScope.GLOBAL
                        ? "border-[#1f6c45] bg-[#1f6c45] text-white"
                        : "border-[#b6cfbe] bg-white/90 text-[#29553f] hover:bg-[#eff8f2]"
                    }`}
                  >
                    온동네
                  </Link>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Link
                    href={makeHref({ nextType: null, nextCursor: null })}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      !type
                        ? "border-[#1f6c45] bg-[#1f6c45] text-white"
                        : "border-[#b6cfbe] bg-white/90 text-[#29553f] hover:bg-[#eff8f2]"
                    }`}
                  >
                    전체
                  </Link>
                  {Object.values(PostType).map((value) => (
                    <Link
                      key={value}
                      href={makeHref({ nextType: value, nextCursor: null })}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        type === value
                          ? "border-[#1f6c45] bg-[#1f6c45] text-white"
                          : "border-[#b6cfbe] bg-white/90 text-[#29553f] hover:bg-[#eff8f2]"
                      }`}
                    >
                      {typeMeta[value].label}
                    </Link>
                  ))}
                </div>
              </div>

              {query ? (
                <p className="text-sm text-[#3c654f]">
                  <span className="font-semibold">&quot;{query}&quot;</span> 검색 결과{" "}
                  <span className="font-bold">{items.length}건</span>
                </p>
              ) : null}
            </div>

            <aside className="flex flex-col gap-4 rounded-3xl border border-[#bdd4c4] bg-white/85 p-5 shadow-[0_12px_24px_rgba(20,69,47,0.1)] backdrop-blur-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-[#5a846d]">
                  Feed Snapshot
                </p>
                <p className="text-2xl font-bold text-[#102a1e]">
                  최신 {items.length}건
                </p>
                <p className="text-xs text-[#4c745f]">
                  구조화된 템플릿 게시글 기반으로 동네 지식을 수집합니다.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-[#d3e4d7] bg-[#f5fbf6] px-2 py-3">
                  <p className="text-lg font-bold text-[#15452f]">{localCount}</p>
                  <p className="text-[11px] text-[#5a846d]">동네</p>
                </div>
                <div className="rounded-2xl border border-[#d3e4d7] bg-[#f5fbf6] px-2 py-3">
                  <p className="text-lg font-bold text-[#15452f]">{globalCount}</p>
                  <p className="text-[11px] text-[#5a846d]">온동네</p>
                </div>
                <div className="rounded-2xl border border-[#d3e4d7] bg-[#f5fbf6] px-2 py-3">
                  <p className="text-lg font-bold text-[#15452f]">{hiddenCount}</p>
                  <p className="text-[11px] text-[#5a846d]">숨김</p>
                </div>
              </div>
              <Link
                href="/posts/new"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#f39d3e] px-4 text-sm font-semibold text-[#2b200f] transition hover:bg-[#e58d2f]"
              >
                새 글 작성
              </Link>
            </aside>
          </div>
        </header>

        <section className="animate-fade-up overflow-hidden rounded-[26px] border border-[#d4e2d7] bg-white/95 shadow-[0_18px_40px_rgba(21,69,47,0.08)] backdrop-blur-sm">
          {items.length === 0 ? (
            <div className="space-y-4 px-6 py-16 text-center sm:px-10">
              <p className="text-5xl">🐾</p>
              <h2 className="text-xl font-bold text-[#1d3e2f]">
                아직 게시물이 없습니다
              </h2>
              <p className="mx-auto max-w-md text-sm leading-6 text-[#5a7d68]">
                첫 게시글을 남겨 동네 피드를 시작하세요. 후기, 질문, 산책 코스
                중 하나만 올려도 피드가 바로 살아납니다.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/posts/new"
                  className="rounded-2xl bg-[#1f6c45] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#195438]"
                >
                  첫 글 작성하기
                </Link>
                <Link
                  href={makeHref({ nextScope: PostScope.GLOBAL })}
                  className="rounded-2xl border border-[#bed3c4] bg-white px-4 py-2.5 text-sm font-semibold text-[#1f6c45] transition hover:bg-[#f2faf5]"
                >
                  온동네 피드 보기
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#e5eee8]">
              {items.map((post, index) => {
                const meta = typeMeta[post.type];
                const excerpt =
                  post.content.length > 130
                    ? `${post.content.slice(0, 130)}...`
                    : post.content;

                return (
                  <article
                    key={post.id}
                    className={`group animate-fade-up px-4 py-5 sm:px-6 sm:py-6 ${
                      post.status === "HIDDEN" ? "bg-[#fff2e8]" : "bg-transparent"
                    }`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.chipClass}`}
                        >
                          <span className="font-bold">{meta.icon}</span>
                          {meta.label}
                        </span>
                        <span className="rounded-full border border-[#cae0d1] bg-[#f3fbf6] px-2.5 py-1 text-[11px] font-semibold text-[#2f6949]">
                          {post.scope === PostScope.LOCAL ? "동네" : "온동네"}
                        </span>
                        <span className="rounded-full border border-[#dde9e0] bg-white px-2.5 py-1 text-[11px] text-[#4d735f]">
                          {post.neighborhood
                            ? `${post.neighborhood.city} ${post.neighborhood.name}`
                            : "전체 지역"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Link
                          href={`/posts/${post.id}`}
                          className="block text-lg font-semibold tracking-tight text-[#102a1e] transition group-hover:text-[#1f6c45] sm:text-xl"
                        >
                          {post.title}
                        </Link>
                        <p className="text-sm leading-6 text-[#4f6c5b]">{excerpt}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4eee7] pt-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#557766]">
                          <span className="font-medium text-[#1f4634]">
                            {post.author.nickname ?? post.author.name ?? "익명"}
                          </span>
                          <span>·</span>
                          <span>{formatRelativeDate(post.createdAt)}</span>
                          {post.status === "HIDDEN" ? (
                            <span className="rounded-full bg-[#e17f50] px-2 py-0.5 text-[10px] font-semibold text-white">
                              숨김 처리
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#355943]">
                          <span className="rounded-full border border-[#d4e4d8] bg-[#f4fbf6] px-2.5 py-1">
                            댓글 {formatCount(post.commentCount)}
                          </span>
                          <span className="rounded-full border border-[#d4e4d8] bg-[#f4fbf6] px-2.5 py-1">
                            조회 {formatCount(post.viewCount)}
                          </span>
                          <span className="rounded-full border border-[#d4e4d8] bg-[#f4fbf6] px-2.5 py-1">
                            좋아요 {formatCount(post.likeCount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {posts.nextCursor ? (
            <div className="border-t border-[#e5eee8] px-4 py-5 text-center sm:px-6">
              <Link
                href={makeHref({ nextCursor: posts.nextCursor })}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#bfd3c3] bg-white px-4 text-sm font-semibold text-[#1f6c45] transition hover:bg-[#f2faf5]"
              >
                더 많은 게시글 보기
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
