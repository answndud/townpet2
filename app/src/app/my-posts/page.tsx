import Link from "next/link";
import { PostScope, PostType } from "@prisma/client";

import { getUserByEmail } from "@/server/queries/user.queries";
import { listUserPosts } from "@/server/queries/post.queries";

type MyPostsPageProps = {
  searchParams?: {
    scope?: "LOCAL" | "GLOBAL";
    type?: PostType;
    q?: string;
  };
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

export default async function MyPostsPage({ searchParams }: MyPostsPageProps) {
  const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
  const user = await getUserByEmail(email);

  if (!user) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
          <p className="text-sm text-[#6f6046]">사용자를 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  const type = Object.values(PostType).includes(searchParams?.type as PostType)
    ? (searchParams?.type as PostType)
    : undefined;
  const scope =
    searchParams?.scope === "LOCAL" || searchParams?.scope === "GLOBAL"
      ? searchParams.scope
      : undefined;
  const query = searchParams?.q?.trim() ?? "";
  const posts = await listUserPosts({
    authorId: user.id,
    scope,
    type,
    q: query || undefined,
  });

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
              My Posts
            </p>
            <h1 className="text-2xl font-semibold">내 작성글</h1>
            <p className="text-sm text-[#6f6046]">
              전체글, 동네 글, 온동네 글을 확인합니다.
            </p>
          </div>
          <form className="flex w-full max-w-md items-center gap-2 text-xs" action="/my-posts">
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
              className="rounded-md border border-[#e3d6c4] bg-white px-3 py-2 text-xs text-[#2a241c]"
            >
              검색
            </button>
            {query ? (
              <Link
                href={type || scope ? `/my-posts?${type ? `type=${type}` : ""}${type && scope ? "&" : ""}${scope ? `scope=${scope}` : ""}` : "/my-posts"}
                className="text-xs text-[#9a8462]"
              >
                초기화
              </Link>
            ) : null}
          </form>
          <div className="flex flex-col gap-2 text-xs text-[#6f6046]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
                카테고리
              </span>
              <Link
                href="/my-posts"
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
                  href={`/my-posts?type=${value}`}
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
                href="/my-posts?scope=LOCAL"
                className={`rounded-md border px-2.5 py-1 transition ${
                  scope === PostScope.LOCAL
                    ? "border-[#e2a763] bg-[#f2c07c] text-[#2a241c]"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                동네 글
              </Link>
              <Link
                href="/my-posts?scope=GLOBAL"
                className={`rounded-md border px-2.5 py-1 transition ${
                  scope === PostScope.GLOBAL
                    ? "border-[#e2a763] bg-[#f2c07c] text-[#2a241c]"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                온동네 글
              </Link>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#e3d6c4] bg-white shadow-sm">
          {posts.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#9a8462]">
              아직 작성한 게시물이 없습니다.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fdf9f2] text-xs uppercase tracking-[0.2em] text-[#9a8462]">
                <tr>
                  <th className="px-4 py-3">타입</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3">동네</th>
                  <th className="px-4 py-3">범위</th>
                  <th className="px-4 py-3 text-right">작성일</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
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
                      {post.scope === PostScope.LOCAL ? "동네" : "온동네"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#9a8462]">
                      {post.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
