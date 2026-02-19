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
  PET_SHOWCASE: "내 반려동물 자랑",
};

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
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (scope) params.set("scope", scope);
  if (query) params.set("q", query);
  if (limit) params.set("limit", String(limit));
  const baseQuery = params.toString();

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
                TownPet Local Feed
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                동네 기반 커뮤니티 피드
              </h1>
              <p className="max-w-2xl text-sm text-[#6f6046]">
                병원과 장소 리뷰를 빠르게 확인하고, 템플릿으로 구조화된
                정보를 남깁니다.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#6f6046]">
              <span className="rounded-full border border-[#e3d6c4] bg-white px-3 py-1">
                최신 {items.length}건
              </span>
              <Link
                href="/posts/new"
                className="rounded-full bg-[#f0b66b] px-4 py-2 text-xs font-semibold text-[#2a241c] transition hover:bg-[#e7a755]"
              >
                글쓰기
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3 text-xs text-[#6f6046]">
            <form className="flex w-full max-w-md items-center gap-2 text-xs" action="/">
              {type ? <input type="hidden" name="type" value={type} /> : null}
              {scope ? <input type="hidden" name="scope" value={scope} /> : null}
              <input
                name="q"
                defaultValue={query}
                placeholder="제목이나 내용 검색"
                className="w-full rounded-md border border-[#e3d6c4] bg-white px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="inline-flex min-w-[64px] items-center justify-center whitespace-nowrap rounded-md border border-[#e3d6c4] bg-white px-4 py-2 text-xs font-semibold text-[#2a241c]"
              >
                검색
              </button>
              {query ? (
                <Link
                  href={type || scope ? `/?${type ? `type=${type}` : ""}${type && scope ? "&" : ""}${scope ? `scope=${scope}` : ""}` : "/"}
                  className="inline-flex min-w-[64px] items-center justify-center whitespace-nowrap rounded-md border border-[#e3d6c4] bg-[#fdf9f2] px-3 py-2 text-xs font-semibold text-[#9a8462]"
                >
                  초기화
                </Link>
              ) : null}
            </form>
            {query ? (
              <div className="text-xs text-[#9a8462]">
                &quot;{query}&quot; 검색 결과 {items.length}건
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
                카테고리
              </span>
              <Link
                href="/"
                className={`rounded-md border px-2.5 py-1 transition ${
                  !type && !scope
                    ? "border-[#e2a763] bg-[#f2c07c] text-[#2a241c]"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                전체
              </Link>
              {Object.values(PostType).map((value) => (
                <Link
                  key={value}
                  href={`/?type=${value}`}
                  className={`rounded-md border px-2.5 py-1 transition ${
                    type === value
                      ? "border-[#e2a763] bg-[#f2c07c] text-[#2a241c]"
                      : "border-[#e3d6c4] bg-white"
                  }`}
                >
                  {typeLabels[value] ?? value}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
                범위
              </span>
              <Link
                href="/?scope=LOCAL"
                className={`rounded-md border px-2.5 py-1 transition ${
                  scope === "LOCAL"
                    ? "border-[#e2a763] bg-[#f2c07c] text-[#2a241c]"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                동네
              </Link>
              <Link
                href="/?scope=GLOBAL"
                className={`rounded-md border px-2.5 py-1 transition ${
                  scope === "GLOBAL"
                    ? "border-[#e2a763] bg-[#f2c07c] text-[#2a241c]"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                온동네
              </Link>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#e3d6c4] bg-white shadow-sm">
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#9a8462]">
              아직 게시물이 없습니다. 상단에서 첫 글을 작성해 주세요.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fdf9f2] text-xs uppercase tracking-[0.2em] text-[#9a8462]">
                <tr>
                  <th className="px-4 py-3">타입</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">동네</th>
                  <th className="px-4 py-3">범위</th>
                  <th className="px-4 py-3">작성자</th>
                  <th className="px-4 py-3 text-right">작성일</th>
                </tr>
              </thead>
              <tbody>
                {items.map((post) => (
                  <tr
                    key={post.id}
                    className={`border-t border-[#efe4d4] text-[#2a241c] ${
                      post.status === "HIDDEN" ? "bg-[#f7ece0]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-[#2a241c]">
                        {typeLabels[post.type] ?? post.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/posts/${post.id}`}
                        className="font-semibold text-[#2a241c] hover:text-[#3a3228]"
                      >
                        {post.title}
                      </Link>
                      {post.commentCount > 0 ? (
                        <span className="ml-2 text-xs font-semibold text-red-500">
                          [{post.commentCount}]
                        </span>
                      ) : null}
                      {post.status === "HIDDEN" ? (
                        <span className="ml-2 rounded-full bg-[#cbbba5] px-2 py-0.5 text-[10px] uppercase text-white">
                          숨김
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6f6046]">
                      {post.neighborhood
                        ? `${post.neighborhood.city} ${post.neighborhood.name}`
                        : "온동네"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6f6046]">
                      {post.scope === "LOCAL" ? "동네" : "온동네"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6f6046]">
                      {post.author.nickname ?? post.author.name ?? "익명"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#9a8462]">
                      {post.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {posts.nextCursor ? (
            <div className="border-t border-[#efe4d4] px-6 py-4 text-right text-xs">
              <Link
                href={
                  baseQuery
                    ? `/?${baseQuery}&cursor=${posts.nextCursor}`
                    : `/?cursor=${posts.nextCursor}`
                }
                className="rounded-md border border-[#e3d6c4] bg-white px-3 py-2 text-xs text-[#2a241c]"
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
