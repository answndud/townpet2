"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostType } from "@prisma/client";

import { BackToFeedButton } from "@/components/posts/back-to-feed-button";
import { PostBoardLinkChip } from "@/components/posts/post-board-link-chip";
import {
  PostDetailInfoItem,
  PostDetailInfoSection,
} from "@/components/posts/post-detail-info-section";
import { GuestPostDetailActions } from "@/components/posts/guest-post-detail-actions";
import { PostBookmarkButton } from "@/components/posts/post-bookmark-button";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { PostPersonalizationDwellTracker } from "@/components/posts/post-personalization-dwell-tracker";
import { PostReactionControls } from "@/components/posts/post-reaction-controls";
import { PostReportForm } from "@/components/posts/post-report-form";
import { PostShareControls } from "@/components/posts/post-share-controls";
import { PostCommentSectionClient } from "@/components/posts/post-comment-section-client";
import { PostViewTracker } from "@/components/posts/post-view-tracker";
import { getGuestPostMeta } from "@/lib/post-guest-meta";
import { UserRelationControls } from "@/components/user/user-relation-controls";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
import { formatRelativeDate } from "@/lib/post-presenter";
import { isReportablePostType } from "@/lib/post-type-groups";
import { toAbsoluteUrl } from "@/lib/site-url";
import { resolveUserDisplayName } from "@/lib/user-display";

type RelationState = {
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
  isMutedByMe: boolean;
};

type PostDetailResponse = {
  ok: boolean;
  data?: {
    post: PostDetailItem;
    viewerId: string | null;
    relationState?: RelationState;
  };
  error?: {
    code: string;
    message: string;
  };
};

type PostDetailItem = {
  id: string;
  authorId: string;
  type: PostType;
  scope: "LOCAL" | "GLOBAL";
  status: "ACTIVE" | "HIDDEN" | "DELETED";
  title: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  viewCount?: number | null;
  likeCount?: number | null;
  dislikeCount?: number | null;
  commentCount?: number | null;
  isBookmarked?: boolean | null;
  author: { id: string; nickname: string | null; image?: string | null };
  guestAuthor?: { displayName?: string | null; ipDisplay?: string | null; ipLabel?: string | null } | null;
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  neighborhood?: { id: string; name: string; city: string; district?: string } | null;
  images: Array<{ url: string; order: number }>;
  hospitalReview?: {
    hospitalName?: string | null;
    totalCost?: number | null;
    waitTime?: number | null;
    rating?: number | null;
    treatmentType?: string | null;
  } | null;
  placeReview?: {
    placeName?: string | null;
    placeType?: string | null;
    address?: string | null;
    isPetAllowed?: boolean | null;
    rating?: number | null;
  } | null;
  walkRoute?: {
    routeName?: string | null;
    distance?: number | null;
    duration?: number | null;
    difficulty?: string | null;
    hasStreetLights?: boolean | null;
    hasRestroom?: boolean | null;
    hasParkingLot?: boolean | null;
    safetyTags?: string[] | null;
  } | null;
  adoptionListing?: {
    shelterName?: string | null;
    region?: string | null;
    animalType?: string | null;
    breed?: string | null;
    ageLabel?: string | null;
    sex?: string | null;
    isNeutered?: boolean | null;
    isVaccinated?: boolean | null;
    sizeLabel?: string | null;
    status?: string | null;
  } | null;
  volunteerRecruitment?: {
    shelterName?: string | null;
    region?: string | null;
    volunteerDate?: string | Date | null;
    volunteerType?: string | null;
    capacity?: number | null;
    status?: string | null;
  } | null;
  renderedContentHtml?: string | null;
  renderedContentText?: string | null;
};

const typeMeta: Record<PostType, { label: string; chipClass: string }> = {
  HOSPITAL_REVIEW: {
    label: "병원후기",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  PLACE_REVIEW: {
    label: "후기/리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  WALK_ROUTE: {
    label: "동네 산책코스",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  MEETUP: {
    label: "동네모임",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  MARKET_LISTING: {
    label: "중고/공동구매",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
  },
  ADOPTION_LISTING: {
    label: "유기동물 입양",
    chipClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  SHELTER_VOLUNTEER: {
    label: "보호소 봉사 모집",
    chipClass: "border-lime-200 bg-lime-50 text-lime-700",
  },
  LOST_FOUND: {
    label: "실종/목격 제보",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  QA_QUESTION: {
    label: "질문/답변",
    chipClass: "border-teal-200 bg-teal-50 text-teal-700",
  },
  QA_ANSWER: {
    label: "질문/답변",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  FREE_POST: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
  DAILY_SHARE: {
    label: "자유게시판",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
  },
  PRODUCT_REVIEW: {
    label: "용품리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PET_SHOWCASE: {
    label: "반려동물 자랑",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

const emptyValue = <span className="tp-text-placeholder">비어 있음</span>;

const renderTextValue = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : emptyValue;

const renderNumberValue = (value: number | null | undefined, suffix = "") =>
  value !== null && value !== undefined ? `${value}${suffix}` : emptyValue;

const renderBooleanValue = (
  value: boolean | null | undefined,
  trueLabel: string,
  falseLabel: string,
) => (value === null || value === undefined ? emptyValue : value ? trueLabel : falseLabel);

const adoptionStatusLabel: Record<string, string> = {
  OPEN: "입양 가능",
  RESERVED: "상담 중",
  ADOPTED: "입양 완료",
  CLOSED: "마감",
};

const animalSexLabel: Record<string, string> = {
  MALE: "수컷",
  FEMALE: "암컷",
  UNKNOWN: "미상",
};

const volunteerStatusLabel: Record<string, string> = {
  OPEN: "모집 중",
  FULL: "정원 마감",
  CLOSED: "모집 종료",
  CANCELLED: "취소",
};

function ensureDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date();
}

function extractAttachmentName(url: string, fallbackIndex: number) {
  try {
    const parsed = url.startsWith("http://") || url.startsWith("https://")
      ? new URL(url)
      : new URL(url, "https://townpet.local");
    const name = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "").trim();
    return name.length > 0 ? name : `첨부파일-${fallbackIndex + 1}`;
  } catch {
    const name = decodeURIComponent(url.split("?")[0]?.split("/").filter(Boolean).pop() ?? "").trim();
    return name.length > 0 ? name : `첨부파일-${fallbackIndex + 1}`;
  }
}

function buildExcerpt(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

type PostDetailClientProps = {
  postId: string;
  cspNonce?: string;
};

export function PostDetailClient({ postId, cspNonce }: PostDetailClientProps) {
  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCommentCountChange = (nextCommentCount: number) => {
    setData((current) => {
      if (!current?.ok || !current.data) {
        return current;
      }

      if (current.data.post.commentCount === nextCommentCount) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          post: {
            ...current.data.post,
            commentCount: nextCommentCount,
          },
        },
      };
    });
  };

  const handleReactionStateChange = ({
    likeCount,
    dislikeCount,
  }: {
    likeCount: number;
    dislikeCount: number;
  }) => {
    setData((current) => {
      if (!current?.ok || !current.data) {
        return current;
      }

      if (
        current.data.post.likeCount === likeCount &&
        current.data.post.dislikeCount === dislikeCount
      ) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          post: {
            ...current.data.post,
            likeCount,
            dislikeCount,
          },
        },
      };
    });
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!postId) {
        setError("게시글을 찾을 수 없습니다.");
        return;
      }

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const response = await fetch(`/api/posts/${postId}/detail`, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });

          if (response.status === 403) {
            if (typeof window !== "undefined") {
              window.location.href = `/posts/${postId}/guest`;
              return;
            }
            throw new Error("보안 확인이 필요합니다. 새로고침 후 다시 시도해 주세요.");
          }

          if (response.status === 401) {
            if (typeof window !== "undefined") {
              window.location.href = `/posts/${postId}/guest`;
              return;
            }
            throw new Error("로그인이 필요한 게시글입니다.");
          }

          const contentType = response.headers.get("content-type") ?? "";
          if (!contentType.includes("application/json")) {
            throw new Error("서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.");
          }

          const payload = (await response.json()) as PostDetailResponse;
          if (!response.ok || !payload.ok) {
            if (response.status === 404 && typeof window !== "undefined") {
              window.location.href = `/posts/${postId}/guest`;
              return;
            }
            throw new Error(payload.error?.message ?? "게시글 로딩 실패");
          }
          if (!cancelled) {
            setData(payload);
          }
          return;
        } catch (err) {
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
            continue;
          }
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "게시글을 불러올 수 없습니다.");
          }
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  if (error) {
    return (
      <div className="tp-page-bg min-h-screen pb-16">
        <main className="mx-auto flex max-w-[1000px] flex-col gap-4 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="tp-border-danger-soft tp-surface-danger-soft rounded-xl border p-6 text-center">
            <h2 className="tp-text-heading text-lg font-semibold">게시글을 불러오지 못했습니다.</h2>
            <p className="tp-text-subtle mt-2 text-sm">{error}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setData(null);
                }}
                className="tp-btn-primary tp-btn-sm"
              >
                다시 시도
              </button>
              <a
                href={`/posts/${postId}/guest`}
                className="tp-btn-soft px-4 py-2"
              >
                게스트 페이지 보기
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="tp-page-bg min-h-screen pb-16">
        <main className="mx-auto flex max-w-[1000px] flex-col gap-4 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="tp-border-soft tp-text-subtle rounded-xl border bg-white p-6 text-center text-sm">
            게시글을 불러오는 중...
          </div>
        </main>
      </div>
    );
  }

  const { post, viewerId } = data.data;
  const resolvedRelationState = data.data.relationState ?? {
    isBlockedByMe: false,
    hasBlockedMe: false,
    isMutedByMe: false,
  };
  const canInteract = Boolean(viewerId);
  const isAuthor = viewerId === post.authorId;
  const canReportPost = isReportablePostType(post.type);
  const canInteractWithPostOwner = !(
    resolvedRelationState.hasBlockedMe || resolvedRelationState.isBlockedByMe
  );
  const meta = typeMeta[post.type];
  const createdAt = ensureDate(post.createdAt);
  const updatedAt = ensureDate(post.updatedAt);
  const resolvedViewCount = Number.isFinite(post.viewCount) ? Number(post.viewCount) : 0;
  const resolvedLikeCount = Number.isFinite(post.likeCount) ? Number(post.likeCount) : 0;
  const resolvedDislikeCount = Number.isFinite(post.dislikeCount) ? Number(post.dislikeCount) : 0;
  const resolvedCommentCount = Number.isFinite(post.commentCount) ? Number(post.commentCount) : 0;
  const renderedContentHtml = post.renderedContentHtml?.trim()
    ? post.renderedContentHtml
    : renderLiteMarkdown(post.content);
  const renderedContentText = post.renderedContentText?.trim()
    ? post.renderedContentText
    : renderedContentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const shouldUsePlainFallback =
    renderedContentText.length === 0 || renderedContentText.includes("미리보기 내용이 없습니다");
  const orderedImages = [...post.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const postUrl = toAbsoluteUrl(`/posts/${post.id}`);
  const loginHref = `/login?next=${encodeURIComponent(`/posts/${post.id}`)}`;
  const guestPostMeta = getGuestPostMeta(post);
  const displayAuthorName = guestPostMeta.guestAuthorName
    ? guestPostMeta.guestAuthorName
    : resolveUserDisplayName(post.author.nickname);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: post.title,
    articleBody: buildExcerpt(post.content, 320),
    datePublished: createdAt.toISOString(),
    dateModified: updatedAt.toISOString(),
    mainEntityOfPage: postUrl,
    author: {
      "@type": "Person",
      name: displayAuthorName,
    },
    image: post.images.map((image) => toAbsoluteUrl(image.url)),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: resolvedLikeCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: resolvedCommentCount,
      },
    ],
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <PostViewTracker postId={post.id} />
      <PostPersonalizationDwellTracker postId={post.id} enabled={Boolean(viewerId)} />
      <script
        nonce={cspNonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <BackToFeedButton className="tp-btn-soft tp-btn-sm inline-flex w-fit items-center" />
        <div>
          <section className="tp-card p-4 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <PostBoardLinkChip type={post.type} label={meta.label} chipClass={meta.chipClass} />
              {post.neighborhood ? (
                <span className="tp-chip-base tp-chip-muted">
                  {post.neighborhood.city} {post.neighborhood.name}
                </span>
              ) : null}
            </div>

            <div className="tp-border-soft mt-3 grid gap-3 border-b pb-4 md:mt-4 md:gap-4 md:pb-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
              <div>
                <h1 className="tp-text-post-title tp-text-primary">
                  {post.title}
                </h1>
              </div>
              <div className="tp-text-muted text-[13px] md:text-right">
                <div className="flex items-start justify-between gap-3 md:flex-col md:items-end">
                  <p className="tp-text-heading min-w-0 break-all font-semibold">
                    {guestPostMeta.isGuestPost ? (
                      <span>
                        {displayAuthorName}
                        {guestPostMeta.guestIpDisplay
                          ? ` (${guestPostMeta.guestIpLabel ?? "아이피"} ${guestPostMeta.guestIpDisplay})`
                          : ""}
                      </span>
                      ) : (
                      <Link href={`/users/${post.author.id}`} className="tp-text-link">
                        {displayAuthorName}
                      </Link>
                    )}
                  </p>
                  <p className="tp-text-subtle text-[11px]">{formatRelativeDate(createdAt)}</p>
                </div>
                <p className="tp-text-meta tp-text-subtle mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:justify-end">
                  <span>조회 {resolvedViewCount.toLocaleString()}</span>
                  <span>좋아요 {resolvedLikeCount.toLocaleString()}</span>
                  <span>싫어요 {resolvedDislikeCount.toLocaleString()}</span>
                  <span>댓글 {resolvedCommentCount.toLocaleString()}</span>
                </p>
                <details className="tp-text-subtle mt-1 text-[11px] md:text-right">
                  <summary className="tp-text-label cursor-pointer list-none font-semibold">상세 정보</summary>
                  <p className="mt-1 leading-5">
                    {createdAt.toLocaleDateString("ko-KR")} ·{" "}
                    {post.neighborhood ? `${post.neighborhood.city} ${post.neighborhood.name}` : "전체"}
                  </p>
                </details>
                {canInteract && !isAuthor ? (
                  <div className="mt-2 md:flex md:justify-end">
                    <UserRelationControls
                      key={`${post.authorId}:${resolvedRelationState.isBlockedByMe ? "1" : "0"}:${resolvedRelationState.isMutedByMe ? "1" : "0"}:${resolvedRelationState.hasBlockedMe ? "1" : "0"}`}
                      targetUserId={post.authorId}
                      initialState={resolvedRelationState}
                      compact
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <section className="tp-border-soft tp-surface-alt mt-3 rounded-xl border px-3 py-3.5 sm:mt-4 sm:px-5 sm:py-4">
              <h2 className="tp-text-label mb-2 text-[11px] font-semibold tracking-[0.14em]">내용</h2>
              <article className="tp-text-body tp-text-primary">
                {shouldUsePlainFallback ? (
                  <div className="whitespace-pre-wrap">{post.content}</div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
                  />
                )}
                {orderedImages.length > 0 ? (
                  <div className="tp-border-soft tp-surface-soft mt-5 border px-3 py-2.5">
                    <p className="tp-text-label text-[11px] font-semibold tracking-[0.08em]">첨부파일</p>
                    <ul className="mt-2 space-y-1">
                      {orderedImages.map((image, index) => {
                        const fileName = extractAttachmentName(image.url, index);
                        return (
                          <li key={`${image.url}-${index}`} className="text-sm">
                            <Link
                              href={image.url}
                              target="_blank"
                              className="tp-text-link break-all underline decoration-[#9db8df] underline-offset-2"
                            >
                              {fileName}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </article>
            </section>

            <div className="tp-border-soft mt-3 space-y-2 border-b pb-3 sm:mt-4 sm:space-y-3 sm:pb-4">
              <div className="tp-border-soft tp-surface-soft rounded-xl border px-2.5 py-2.5 sm:px-3 sm:py-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="hidden sm:block" aria-hidden="true" />
                  <div className="flex justify-center sm:justify-self-center">
                    <PostReactionControls
                      key={`${post.id}:${canInteract ? "viewer" : "guest"}:${canInteractWithPostOwner ? "interactive" : "blocked"}`}
                      postId={post.id}
                      likeCount={resolvedLikeCount}
                      dislikeCount={resolvedDislikeCount}
                      currentReaction={canInteract ? undefined : null}
                      canReact={canInteract && canInteractWithPostOwner}
                      loginHref={loginHref}
                      onStateChange={handleReactionStateChange}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-self-end">
                    <PostBookmarkButton
                      key={`${post.id}:${canInteract ? "viewer" : "guest"}`}
                      postId={post.id}
                      currentBookmarked={Boolean(post.isBookmarked)}
                      canBookmark={canInteract && canInteractWithPostOwner}
                      loginHref={loginHref}
                      compact
                    />
                    <PostShareControls url={postUrl} compact />
                  </div>
                </div>
              </div>
              {isAuthor ? (
                <>
                  <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className="tp-btn-soft tp-btn-sm"
                    >
                      수정
                    </Link>
                    <PostDetailActions postId={post.id} />
                  </div>
                  <details className="sm:hidden">
                    <summary className="tp-btn-soft tp-btn-sm inline-flex items-center">
                      글 관리
                    </summary>
                    <div className="tp-border-soft tp-surface-soft mt-2 flex flex-wrap items-center gap-2 rounded-xl border p-2">
                      <Link
                        href={`/posts/${post.id}/edit`}
                        className="tp-btn-soft tp-btn-sm inline-flex items-center"
                      >
                        수정
                      </Link>
                      <PostDetailActions postId={post.id} />
                    </div>
                  </details>
                </>
              ) : null}
              {!canInteract && guestPostMeta.isGuestPost ? (
                <GuestPostDetailActions postId={post.id} />
              ) : null}
            </div>

            {canInteract && !isAuthor && !canInteractWithPostOwner ? (
              <div className="mt-4 border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                차단 관계에서는 {canReportPost ? "댓글/반응/신고" : "댓글/반응"} 기능을 사용할 수 없습니다.
              </div>
            ) : null}

            {canReportPost && canInteract && !isAuthor && canInteractWithPostOwner ? (
              <details className="tp-border-soft tp-surface-alt mt-3 rounded-lg border px-3 py-2.5">
                <summary className="tp-btn-soft tp-btn-xs inline-flex cursor-pointer items-center">게시글 신고</summary>
                <div className="tp-border-soft mt-2 rounded-lg border bg-white p-3">
                  <PostReportForm targetId={post.id} />
                </div>
              </details>
            ) : null}
          </section>
        </div>

        {post.hospitalReview ? (
          <PostDetailInfoSection title="병원후기 상세">
            <PostDetailInfoItem label="병원" value={renderTextValue(post.hospitalReview.hospitalName)} />
            <PostDetailInfoItem label="치료" value={renderTextValue(post.hospitalReview.treatmentType)} />
            <PostDetailInfoItem label="평점" value={renderNumberValue(post.hospitalReview.rating, "점")} />
            <PostDetailInfoItem
              label="비용"
              value={
                post.hospitalReview.totalCost !== null && post.hospitalReview.totalCost !== undefined
                  ? `${post.hospitalReview.totalCost.toLocaleString()}원`
                  : emptyValue
              }
            />
            <PostDetailInfoItem label="대기" value={renderNumberValue(post.hospitalReview.waitTime, "분")} />
          </PostDetailInfoSection>
        ) : null}

        {post.placeReview ? (
          <PostDetailInfoSection title="후기/리뷰 상세">
            <PostDetailInfoItem label="장소명" value={renderTextValue(post.placeReview.placeName)} />
            <PostDetailInfoItem label="유형" value={renderTextValue(post.placeReview.placeType)} />
            <PostDetailInfoItem label="주소" value={renderTextValue(post.placeReview.address)} />
            <PostDetailInfoItem
              label="반려동물"
              value={renderBooleanValue(post.placeReview.isPetAllowed, "가능", "불가")}
            />
            <PostDetailInfoItem label="평점" value={renderNumberValue(post.placeReview.rating, "점")} />
          </PostDetailInfoSection>
        ) : null}

        {post.walkRoute ? (
          <PostDetailInfoSection title="동네 산책코스 상세">
            <PostDetailInfoItem label="코스명" value={renderTextValue(post.walkRoute.routeName)} />
            <PostDetailInfoItem label="거리" value={renderNumberValue(post.walkRoute.distance, "km")} />
            <PostDetailInfoItem label="시간" value={renderNumberValue(post.walkRoute.duration, "분")} />
            <PostDetailInfoItem label="난이도" value={renderTextValue(post.walkRoute.difficulty)} />
            <PostDetailInfoItem
              label="편의시설"
              span="wide"
              value={
                [
                  post.walkRoute.hasStreetLights ? "가로등" : null,
                  post.walkRoute.hasRestroom ? "화장실" : null,
                  post.walkRoute.hasParkingLot ? "주차장" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "정보 없음"
              }
            />
            <PostDetailInfoItem
              label="안전 태그"
              span="full"
              value={
                post.walkRoute.safetyTags && post.walkRoute.safetyTags.length > 0
                  ? post.walkRoute.safetyTags.join(", ")
                  : "없음"
              }
            />
          </PostDetailInfoSection>
        ) : null}

        {post.adoptionListing ? (
          <PostDetailInfoSection title="유기동물 입양 정보">
            <PostDetailInfoItem label="보호소" value={renderTextValue(post.adoptionListing.shelterName)} />
            <PostDetailInfoItem label="지역" value={renderTextValue(post.adoptionListing.region)} />
            <PostDetailInfoItem
              label="상태"
              value={renderTextValue(
                post.adoptionListing.status
                  ? (adoptionStatusLabel[post.adoptionListing.status] ?? post.adoptionListing.status)
                  : null,
              )}
            />
            <PostDetailInfoItem label="동물 종류" value={renderTextValue(post.adoptionListing.animalType)} />
            <PostDetailInfoItem label="품종" value={renderTextValue(post.adoptionListing.breed)} />
            <PostDetailInfoItem label="나이" value={renderTextValue(post.adoptionListing.ageLabel)} />
            <PostDetailInfoItem
              label="성별"
              value={renderTextValue(
                post.adoptionListing.sex
                  ? (animalSexLabel[post.adoptionListing.sex] ?? post.adoptionListing.sex)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="중성화"
              value={renderBooleanValue(post.adoptionListing.isNeutered, "완료", "미완료")}
            />
            <PostDetailInfoItem
              label="예방접종"
              value={renderBooleanValue(post.adoptionListing.isVaccinated, "완료", "미완료")}
            />
            <PostDetailInfoItem
              label="체형/크기"
              span="full"
              value={renderTextValue(post.adoptionListing.sizeLabel)}
            />
          </PostDetailInfoSection>
        ) : null}

        {post.volunteerRecruitment ? (
          <PostDetailInfoSection title="보호소 봉사 모집 정보">
            <PostDetailInfoItem label="보호소" value={renderTextValue(post.volunteerRecruitment.shelterName)} />
            <PostDetailInfoItem label="지역" value={renderTextValue(post.volunteerRecruitment.region)} />
            <PostDetailInfoItem
              label="모집 상태"
              value={renderTextValue(
                post.volunteerRecruitment.status
                  ? (volunteerStatusLabel[post.volunteerRecruitment.status] ??
                    post.volunteerRecruitment.status)
                  : null,
              )}
            />
            <PostDetailInfoItem
              label="봉사 일정"
              value={
                post.volunteerRecruitment.volunteerDate
                  ? new Date(post.volunteerRecruitment.volunteerDate).toLocaleString("ko-KR")
                  : emptyValue
              }
            />
            <PostDetailInfoItem
              label="봉사 유형"
              value={renderTextValue(post.volunteerRecruitment.volunteerType)}
            />
            <PostDetailInfoItem
              label="모집 인원"
              value={renderNumberValue(post.volunteerRecruitment.capacity, "명")}
            />
          </PostDetailInfoSection>
        ) : null}

        <PostCommentSectionClient
          postId={post.id}
          currentUserId={viewerId ?? undefined}
          canInteract={canInteract}
          canInteractWithPostOwner={canInteractWithPostOwner}
          loginHref={loginHref}
          onCommentCountChange={handleCommentCountChange}
        />
      </main>
    </div>
  );
}
