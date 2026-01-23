import Link from "next/link";
import { notFound } from "next/navigation";
import { PostType } from "@prisma/client";

import { PostCommentThread } from "@/components/posts/post-comment-thread";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { PostReportForm } from "@/components/posts/post-report-form";
import { listNeighborhoods } from "@/server/queries/neighborhood.queries";
import { listComments } from "@/server/queries/comment.queries";
import { getPostById } from "@/server/queries/post.queries";
import { getUserByEmail } from "@/server/queries/user.queries";

type PostDetailPageProps = {
  params?: Promise<{ id?: string }>;
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

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = (await params) ?? {};
  const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
  const [post, neighborhoods, comments, user] = await Promise.all([
    getPostById(resolvedParams.id),
    listNeighborhoods(),
    resolvedParams.id ? listComments(resolvedParams.id) : Promise.resolve([]),
    getUserByEmail(email),
  ]);

  if (!post) {
    notFound();
  }

  const isAuthor = user?.id === post.authorId;

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-zinc-500"
        >
          Back to feed
        </Link>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          {post.status === "HIDDEN" ? (
            <div className="mb-4 rounded-xl border border-[#e3d6c4] bg-[#fdf1e5] px-4 py-3 text-xs text-[#6f6046]">
              신고 누적으로 숨김 처리된 게시물입니다. 관리자 검토 후 공개될 수
              있습니다.
            </div>
          ) : null}
          <div className="flex items-center justify-between text-xs text-[#6f6046]">
            <span className="text-xs font-semibold text-[#2a241c]">
              {typeLabels[post.type] ?? post.type}
            </span>
            <span>{post.createdAt.toLocaleDateString("ko-KR")}</span>
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight">
              {post.title}
            </h1>
            {isAuthor ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="rounded-full border border-[#e3d6c4] px-4 py-2 text-xs font-semibold text-[#2a241c]"
                >
                  수정
                </Link>
                <PostDetailActions postId={post.id} />
              </div>
            ) : null}
          </div>
          <div className="mt-4 border-t border-[#efe4d4] pt-4">
            <p className="whitespace-pre-line text-sm text-[#6f6046]">
              {post.content}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-[#6f6046]">
            <span>
              작성자: {post.author.nickname ?? post.author.name ?? "익명"}
            </span>
            <span>
              위치: {post.neighborhood
                ? `${post.neighborhood.city} ${post.neighborhood.name}`
                : "Global"}
            </span>
            <span>
              범위: {post.scope === "LOCAL" ? "동네" : "온동네"}
            </span>
          </div>
        </section>

        {!isAuthor ? (
          <details className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-[#2a241c]">
              신고
            </summary>
            <div className="mt-4">
              <PostReportForm postId={post.id} />
            </div>
          </details>
        ) : null}

        {post.hospitalReview ? (
          <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">병원 리뷰 상세</h2>
            <div className="mt-4 grid gap-4 text-sm text-[#6f6046] md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Hospital
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.hospitalReview.hospitalName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Visit
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.hospitalReview.visitDate.toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Treatment
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.hospitalReview.treatmentType}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Rating
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.hospitalReview.rating}점
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Cost
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.hospitalReview.totalCost !== null
                    ? `${post.hospitalReview.totalCost.toLocaleString()}원`
                    : "미기재"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Waiting
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.hospitalReview.waitTime !== null
                    ? `${post.hospitalReview.waitTime}분`
                    : "미기재"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {post.placeReview ? (
          <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">장소 리뷰 상세</h2>
            <div className="mt-4 grid gap-4 text-sm text-[#6f6046] md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Place
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.placeReview.placeName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Type
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.placeReview.placeType}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Address
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.placeReview.address ?? "미기재"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Pet Friendly
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.placeReview.isPetAllowed ? "가능" : "불가"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Rating
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {post.placeReview.rating}점
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {post.walkRoute ? (
          <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">산책로 상세</h2>
            <div className="mt-4 grid gap-4 text-sm text-[#6f6046] md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
                  Route
                </p>
                <p className="mt-1 font-medium text-[#2a241c]">
                  {post.walkRoute.routeName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
                  Distance
                </p>
                <p className="mt-1 font-medium text-[#2a241c]">
                  {post.walkRoute.distance !== null
                    ? `${post.walkRoute.distance}km`
                    : "미기재"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
                  Duration
                </p>
                <p className="mt-1 font-medium text-[#2a241c]">
                  {post.walkRoute.duration !== null
                    ? `${post.walkRoute.duration}분`
                    : "미기재"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
                  Difficulty
                </p>
                <p className="mt-1 font-medium text-[#2a241c]">
                  {post.walkRoute.difficulty}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
                  Amenities
                </p>
                <p className="mt-1 font-medium text-[#2a241c]">
                  {[
                    post.walkRoute.hasStreetLights ? "가로등" : null,
                    post.walkRoute.hasRestroom ? "화장실" : null,
                    post.walkRoute.hasParkingLot ? "주차장" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "정보 없음"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
                  Safety Tags
                </p>
                <p className="mt-1 font-medium text-[#2a241c]">
                  {post.walkRoute.safetyTags.length > 0
                    ? post.walkRoute.safetyTags.join(", ")
                    : "없음"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <PostCommentThread
          postId={post.id}
          comments={comments}
          currentUserId={user?.id}
        />
      </main>
    </div>
  );
}
