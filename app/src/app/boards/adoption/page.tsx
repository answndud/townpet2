import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostType } from "@prisma/client";

import { AdoptionBoardGrid } from "@/components/boards/adoption-board-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";
import { auth } from "@/lib/auth";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import {
  countAdoptionBoardPosts,
  listAdoptionBoardPostsPage,
} from "@/server/queries/community.queries";

const ADOPTION_BOARD_PAGE_SIZE = 12;

type AdoptionBoardPageProps = {
  searchParams?: Promise<{
    q?: string;
    page?: string;
  }>;
};

export const metadata: Metadata = {
  title: "유기동물 입양",
  description: "대표 사진과 핵심 정보를 카드형으로 비교하며 입양 대상을 살펴보세요.",
  alternates: {
    canonical: "/boards/adoption",
  },
  openGraph: {
    title: "TownPet 유기동물 입양",
    description: "대표 사진과 핵심 정보를 카드형으로 비교하며 입양 대상을 살펴보세요.",
    url: "/boards/adoption",
  },
};

function buildAdoptionBoardHref({
  q,
  page,
}: {
  q?: string | null;
  page?: number | null;
}) {
  const params = new URLSearchParams();
  if (q && q.trim().length > 0) {
    params.set("q", q.trim());
  }
  if (page && page > 1) {
    params.set("page", String(page));
  }
  const serialized = params.toString();
  return serialized ? `/boards/adoption?${serialized}` : "/boards/adoption";
}

export default async function AdoptionBoardPage({
  searchParams,
}: AdoptionBoardPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  redirectToProfileIfNicknameMissing({
    isAuthenticated: Boolean(userId),
    nickname: session?.user?.nickname,
  });

  const resolvedParams = (await searchParams) ?? {};
  const query = typeof resolvedParams.q === "string" ? resolvedParams.q.trim() : "";
  const requestedPage = Number.parseInt(
    typeof resolvedParams.page === "string" ? resolvedParams.page : "1",
    10,
  );
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const loginRequiredTypes = userId ? [] : await getGuestReadLoginRequiredPostTypes();
  const isGuestTypeBlocked =
    !userId && isLoginRequiredPostType(PostType.ADOPTION_LISTING, loginRequiredTypes);

  if (isGuestTypeBlocked) {
    redirect(`/login?next=${encodeURIComponent(buildAdoptionBoardHref({ q: query, page: currentPage }))}`);
  }

  const totalCount = await countAdoptionBoardPosts({
    q: query || undefined,
  });
  const totalPages = Math.max(1, Math.ceil(totalCount / ADOPTION_BOARD_PAGE_SIZE));
  const resolvedPage = Math.min(currentPage, totalPages);
  const items = await listAdoptionBoardPostsPage({
    page: resolvedPage,
    limit: ADOPTION_BOARD_PAGE_SIZE,
    q: query || undefined,
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#fdfefe_42%,#fbfdff_100%)] pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="overflow-hidden rounded-[32px] border border-[#eadfba] bg-[linear-gradient(135deg,#fff4d0,#fffdf7_52%,#eef7ff)] p-5 shadow-[0_18px_40px_rgba(80,60,12,0.08)] sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8d6a18]">
            Adoption Board
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-[#3d2c08] sm:text-4xl">
                유기동물 입양 게시판
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6f5a20]">
              <span className="rounded-full border border-[#eddca5] bg-white/80 px-3 py-1">
                총 {totalCount}건
              </span>
              <span className="rounded-full border border-[#eddca5] bg-white/80 px-3 py-1">
                페이지당 {ADOPTION_BOARD_PAGE_SIZE}건
              </span>
            </div>
          </div>

          <form action="/boards/adoption" className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              defaultValue={query}
              placeholder="보호소명, 지역, 동물종, 품종 검색"
              className="h-11 flex-1 rounded-2xl border border-[#dccb95] bg-white px-4 text-sm text-[#3f300c] outline-none transition focus:border-[#c49d2d]"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#b9891f] px-5 text-sm font-semibold text-white transition hover:bg-[#9d7419]"
            >
              검색
            </button>
            {query ? (
              <Link
                href="/boards/adoption"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#d8c69a] bg-white px-5 text-sm font-semibold text-[#725a22] transition hover:bg-[#fffaf0]"
              >
                초기화
              </Link>
            ) : null}
          </form>
        </header>

        {items.length === 0 ? (
          <section className="tp-card overflow-hidden">
            <EmptyState
              title="입양 게시글이 없습니다"
              description={
                query
                  ? "검색어에 맞는 입양 게시글이 없습니다. 다른 키워드로 다시 시도해 보세요."
                  : "아직 등록된 입양 게시글이 없습니다."
              }
              actionHref="/posts/new"
              actionLabel="입양 글 등록하기"
            />
          </section>
        ) : (
          <section className="space-y-4">
            <AdoptionBoardGrid
              items={items}
              isAuthenticated={Boolean(userId)}
            />

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-[24px] border border-[#e3ebf8] bg-white px-3 py-3">
                <Link
                  href={buildAdoptionBoardHref({ q: query, page: Math.max(1, resolvedPage - 1) })}
                  aria-disabled={resolvedPage <= 1}
                  className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-semibold transition ${
                    resolvedPage <= 1
                      ? "pointer-events-none border-[#d8e3f4] bg-[#eef3fb] text-[#96aac7]"
                      : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                  }`}
                >
                  이전
                </Link>
                {Array.from(
                  {
                    length:
                      Math.min(totalPages, Math.max(5, resolvedPage + 2)) -
                      Math.max(1, Math.min(resolvedPage - 2, totalPages - 4)) +
                      1,
                  },
                  (_, index) =>
                    Math.max(1, Math.min(resolvedPage - 2, totalPages - 4)) + index,
                ).map((pageNumber) => (
                  <Link
                    key={`adoption-board-page-${pageNumber}`}
                    href={buildAdoptionBoardHref({ q: query, page: pageNumber })}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-xs font-semibold transition ${
                      pageNumber === resolvedPage
                        ? "border-[#3567b5] bg-[#3567b5] text-white"
                        : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                ))}
                <Link
                  href={buildAdoptionBoardHref({ q: query, page: Math.min(totalPages, resolvedPage + 1) })}
                  aria-disabled={resolvedPage >= totalPages}
                  className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-semibold transition ${
                    resolvedPage >= totalPages
                      ? "pointer-events-none border-[#d8e3f4] bg-[#eef3fb] text-[#96aac7]"
                      : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                  }`}
                >
                  다음
                </Link>
              </div>
            ) : null}
          </section>
        )}

        <div className="flex justify-end gap-2">
          <ScrollToTopButton className="tp-btn-soft inline-flex h-10 items-center justify-center px-4 text-xs font-semibold" />
          <Link
            href="/posts/new"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#b9891f] px-4 text-xs font-semibold text-white transition hover:bg-[#9d7419]"
          >
            입양 글 작성
          </Link>
        </div>
      </main>
    </div>
  );
}
