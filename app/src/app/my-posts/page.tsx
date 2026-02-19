import Link from "next/link";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostSignalIcons } from "@/components/posts/post-signal-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { getPostSignals } from "@/lib/post-presenter";
import { postListSchema } from "@/lib/validations/post";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { listUserPosts } from "@/server/queries/post.queries";

type MyPostsPageProps = {
  searchParams?: Promise<{
    scope?: "LOCAL" | "GLOBAL";
    type?: PostType;
    q?: string;
  }>;
};

const typeLabels: Record<PostType, string> = {
  HOSPITAL_REVIEW: "병원",
  PLACE_REVIEW: "장소",
  WALK_ROUTE: "산책",
  MEETUP: "번개",
  MARKET_LISTING: "마켓",
  LOST_FOUND: "실종",
  QA_QUESTION: "Q&A",
  QA_ANSWER: "답변",
  FREE_POST: "자유",
  FREE_BOARD: "자유게시판",
  DAILY_SHARE: "일상공유",
  PRODUCT_REVIEW: "제품리뷰",
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

export default async function MyPostsPage({ searchParams }: MyPostsPageProps) {
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

  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);
  if (!primaryNeighborhood && scope !== PostScope.GLOBAL) {
    return (
      <NeighborhoodGateNotice
        title="내 작성글을 보려면 동네 설정이 필요합니다."
        description="대표 동네를 설정하면 작성 내역을 확인할 수 있습니다."
        secondaryLink="/my-posts?scope=GLOBAL"
        secondaryLabel="온동네 글 보기"
      />
    );
  }

  const query = parsedParams.success ? parsedParams.data.q?.trim() ?? "" : "";
  const posts = await listUserPosts({
    authorId: user.id,
    scope,
    type,
    q: query || undefined,
  });

  const makeHref = ({
    nextType,
    nextScope,
    nextQuery,
  }: {
    nextType?: PostType | null;
    nextScope?: PostScope | null;
    nextQuery?: string | null;
  }) => {
    const params = new URLSearchParams();
    const resolvedType = nextType === undefined ? type : nextType;
    const resolvedScope = nextScope === undefined ? scope : nextScope;
    const resolvedQuery = nextQuery === undefined ? query : nextQuery;

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedScope) params.set("scope", resolvedScope);
    if (resolvedQuery) params.set("q", resolvedQuery);

    const serialized = params.toString();
    return serialized ? `/my-posts?${serialized}` : "/my-posts";
  };

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">내 작성글</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            내가 올린 게시글
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            카테고리와 범위를 조합해 내 글을 빠르게 확인할 수 있습니다.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
              <form action="/my-posts" className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {type ? <input type="hidden" name="type" value={type} /> : null}
                {scope ? <input type="hidden" name="scope" value={scope} /> : null}
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
                    href={makeHref({ nextQuery: null })}
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
                      {typeLabels[value]}
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
                  href={makeHref({ nextScope: PostScope.LOCAL })}
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    scope === PostScope.LOCAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  동네 글
                </Link>
                <Link
                  href={makeHref({ nextScope: PostScope.GLOBAL })}
                  className={`border px-3 py-2 text-center text-xs font-semibold transition ${
                    scope === PostScope.GLOBAL
                      ? "border-[#3567b5] bg-[#3567b5] text-white"
                      : "border-[#b9cbeb] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                  }`}
                >
                  온동네 글
                </Link>
              </div>
              <p className="mt-3 border-t border-[#dbe6f6] pt-3 text-xs text-[#4f678d]">
                총 {posts.length}건
              </p>
            </aside>
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white">
          {posts.length === 0 ? (
            <EmptyState
              title="작성한 게시글이 없습니다"
              description="첫 게시글을 작성하고 피드에서 반응을 확인해 보세요."
              actionHref="/posts/new"
              actionLabel="첫 글 작성하기"
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
                    className={`grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center ${
                      post.status === "HIDDEN" ? "bg-[#fff5f5]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="border border-[#d2ddf0] bg-[#f6f9ff] px-2 py-0.5 text-[#2f548f]">
                          {typeLabels[post.type]}
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
                        className="flex min-w-0 items-center gap-1 text-base font-semibold text-[#10284a] transition hover:text-[#2f5da4] sm:text-lg"
                      >
                        <span className="truncate">{post.title}</span>
                        <PostSignalIcons signals={signals} />
                        {post.commentCount > 0 ? (
                          <span className="shrink-0 text-[#2f5da4]">[{post.commentCount}]</span>
                        ) : null}
                      </Link>
                      <p className="mt-1 truncate text-sm text-[#4c6488]">
                        {post.content.length > 120
                          ? `${post.content.slice(0, 120)}...`
                          : post.content}
                      </p>
                    </div>

                    <div className="text-xs text-[#4f678d] md:text-right">
                      <p>{formatRelativeDate(post.createdAt)}</p>
                      <p className="mt-2 text-[11px] text-[#6a84ab]">
                        조회 {post.viewCount.toLocaleString()} · 좋아요 {post.likeCount.toLocaleString()}
                      </p>
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
