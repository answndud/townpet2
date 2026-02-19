import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostCommentThread } from "@/components/posts/post-comment-thread";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { PostReactionControls } from "@/components/posts/post-reaction-controls";
import { PostReportForm } from "@/components/posts/post-report-form";
import { auth } from "@/lib/auth";
import { listComments } from "@/server/queries/comment.queries";
import { getPostById } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

type PostDetailPageProps = {
  params?: Promise<{ id?: string }>;
};

const typeMeta: Record<PostType, { label: string; chipClass: string }> = {
  HOSPITAL_REVIEW: {
    label: "병원",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  PLACE_REVIEW: {
    label: "장소",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  WALK_ROUTE: {
    label: "산책",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  MEETUP: {
    label: "번개",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  MARKET_LISTING: {
    label: "마켓",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
  },
  LOST_FOUND: {
    label: "실종",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  QA_QUESTION: {
    label: "Q&A",
    chipClass: "border-teal-200 bg-teal-50 text-teal-700",
  },
  QA_ANSWER: {
    label: "답변",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  FREE_POST: {
    label: "자유",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
  DAILY_SHARE: {
    label: "일상공유",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
  },
  PRODUCT_REVIEW: {
    label: "제품리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PET_SHOWCASE: {
    label: "내 반려동물 자랑",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

const emptyValue = <span className="text-[#95a8c5]">비어 있음</span>;

const renderTextValue = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : emptyValue;

const renderNumberValue = (value: number | null | undefined, suffix = "") =>
  value !== null && value !== undefined ? `${value}${suffix}` : emptyValue;

const renderBooleanValue = (
  value: boolean | null | undefined,
  trueLabel: string,
  falseLabel: string,
) => (value === null || value === undefined ? emptyValue : value ? trueLabel : falseLabel);

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

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = (await params) ?? {};
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const user = await getUserWithNeighborhoods(userId);
  if (!user) {
    redirect("/login");
  }

  const [post, comments] = await Promise.all([
    getPostById(resolvedParams.id, user.id),
    resolvedParams.id ? listComments(resolvedParams.id) : Promise.resolve([]),
  ]);

  if (!post) {
    notFound();
  }

  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);
  if (!primaryNeighborhood && post.scope !== "GLOBAL") {
    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="동네를 설정해야 로컬 게시물을 볼 수 있습니다."
        secondaryLink="/feed?scope=GLOBAL"
        secondaryLabel="온동네 피드 보기"
      />
    );
  }

  const isAuthor = user.id === post.authorId;
  const meta = typeMeta[post.type];
  const safeViewCount = Number.isFinite(post.viewCount) ? Number(post.viewCount) : 0;
  const safeLikeCount = Number.isFinite(post.likeCount) ? Number(post.likeCount) : 0;
  const safeDislikeCount = Number.isFinite(post.dislikeCount)
    ? Number(post.dislikeCount)
    : 0;
  const safeCommentCount = Number.isFinite(post.commentCount)
    ? Number(post.commentCount)
    : 0;

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <Link href="/feed" className="text-xs font-medium uppercase tracking-[0.24em] text-[#4e6f9f]">
          목록으로
        </Link>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
            {post.status === "HIDDEN" ? (
              <div className="mb-5 border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                신고 누적으로 숨김 처리된 게시물입니다. 관리자 검토 후 다시 공개될 수 있습니다.
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`border px-2.5 py-0.5 font-semibold ${meta.chipClass}`}>
                {meta.label}
              </span>
              <span className="border border-[#d2ddf0] bg-[#f6f9ff] px-2.5 py-0.5 text-[#315484]">
                {post.scope === "LOCAL" ? "동네" : "온동네"}
              </span>
              {post.neighborhood ? (
                <span className="border border-[#dbe5f3] bg-white px-2.5 py-0.5 text-[#5d789f]">
                  {post.neighborhood.city} {post.neighborhood.name}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 border-b border-[#e0e9f5] pb-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
              <div>
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#10284a] sm:text-4xl">
                  {post.title}
                </h1>
              </div>
              <div className="text-sm text-[#4f678d] md:text-right">
                <p className="font-semibold text-[#1f3f71]">
                  {post.author.nickname ?? post.author.name ?? "익명"}
                </p>
                <p className="mt-1">{formatRelativeDate(post.createdAt)}</p>
                <p className="mt-3 text-xs text-[#6883ab]">
                  조회 {safeViewCount.toLocaleString()} · 좋아요 {safeLikeCount.toLocaleString()} · 싫어요{" "}
                  {safeDislikeCount.toLocaleString()} · 댓글 {safeCommentCount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-4 border-b border-[#e0e9f5] pb-4">
              <PostReactionControls
                postId={post.id}
                likeCount={safeLikeCount}
                dislikeCount={safeDislikeCount}
                currentReaction={post.reactions?.[0]?.type ?? null}
              />
            </div>

            {isAuthor ? (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="border border-[#bfd0ec] bg-white px-4 py-2 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
                >
                  수정
                </Link>
                <PostDetailActions postId={post.id} />
              </div>
            ) : null}

            <article className="mt-6 whitespace-pre-line text-[15px] leading-8 text-[#1b3157]">
              {post.content}
            </article>
          </section>

          <aside className="space-y-4">
            <section className="border border-[#c8d7ef] bg-[#f7fbff] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#4f6f9f]">
                게시글 정보
              </h2>
              <dl className="mt-3 space-y-2 text-sm text-[#355988]">
                <div className="flex items-center justify-between border-b border-[#dde7f5] pb-2">
                  <dt>작성일</dt>
                  <dd>{post.createdAt.toLocaleDateString("ko-KR")}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-[#dde7f5] pb-2">
                  <dt>범위</dt>
                  <dd>{post.scope === "LOCAL" ? "동네" : "온동네"}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-[#dde7f5] pb-2">
                  <dt>위치</dt>
                  <dd>
                    {post.neighborhood
                      ? `${post.neighborhood.city} ${post.neighborhood.name}`
                      : "전체"}
                  </dd>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <dt>상태</dt>
                  <dd>{post.status === "HIDDEN" ? "숨김" : "정상"}</dd>
                </div>
              </dl>
            </section>

            {!isAuthor ? (
              <details className="border border-[#c8d7ef] bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#1f3f71]">
                  게시글 신고
                </summary>
                <div className="mt-3">
                  <PostReportForm postId={post.id} />
                </div>
              </details>
            ) : null}
          </aside>
        </div>

        {post.hospitalReview ? (
          <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#163462]">병원 리뷰 상세</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">병원</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.hospitalReview.hospitalName)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">치료</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.hospitalReview.treatmentType)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">평점</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.hospitalReview.rating, "점")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">비용</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {post.hospitalReview.totalCost !== null && post.hospitalReview.totalCost !== undefined
                    ? `${post.hospitalReview.totalCost.toLocaleString()}원`
                    : emptyValue}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">대기</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.hospitalReview.waitTime, "분")}</p>
              </div>
            </div>
          </section>
        ) : null}

        {post.placeReview ? (
          <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#163462]">장소 리뷰 상세</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">장소명</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.placeReview.placeName)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">유형</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.placeReview.placeType)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">주소</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.placeReview.address)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">반려동물</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderBooleanValue(post.placeReview.isPetAllowed, "가능", "불가")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">평점</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.placeReview.rating, "점")}</p>
              </div>
            </div>
          </section>
        ) : null}

        {post.walkRoute ? (
          <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#163462]">산책로 상세</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#355988] md:grid-cols-3">
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">코스명</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.walkRoute.routeName)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">거리</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.walkRoute.distance, "km")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">시간</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderNumberValue(post.walkRoute.duration, "분")}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">난이도</p>
                <p className="mt-1 font-medium text-[#1f3f71]">{renderTextValue(post.walkRoute.difficulty)}</p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3 md:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">편의시설</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {[
                    post.walkRoute.hasStreetLights ? "가로등" : null,
                    post.walkRoute.hasRestroom ? "화장실" : null,
                    post.walkRoute.hasParkingLot ? "주차장" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "정보 없음"}
                </p>
              </div>
              <div className="border border-[#dde7f5] bg-[#f8fbff] px-3 py-3 md:col-span-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c84ab]">안전 태그</p>
                <p className="mt-1 font-medium text-[#1f3f71]">
                  {post.walkRoute.safetyTags && post.walkRoute.safetyTags.length > 0
                    ? post.walkRoute.safetyTags.join(", ")
                    : "없음"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <PostCommentThread postId={post.id} comments={comments} currentUserId={user.id} />
      </main>
    </div>
  );
}
