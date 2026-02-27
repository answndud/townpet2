import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PostType, Prisma } from "@prisma/client";
import { cache, Suspense } from "react";
import { unstable_cache } from "next/cache";

import { BackToFeedButton } from "@/components/posts/back-to-feed-button";
import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostCommentThread } from "@/components/posts/post-comment-thread";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { GuestPostDetailActions } from "@/components/posts/guest-post-detail-actions";
import { PostReactionControls } from "@/components/posts/post-reaction-controls";
import { PostReportForm } from "@/components/posts/post-report-form";
import { PostShareControls } from "@/components/posts/post-share-controls";
import { UserRelationControls } from "@/components/user/user-relation-controls";
import { auth } from "@/lib/auth";
import { renderLiteMarkdown } from "@/lib/markdown-lite";
import { canGuestReadPost } from "@/lib/post-access";
import { formatRelativeDate } from "@/lib/post-presenter";
import { toAbsoluteUrl } from "@/lib/site-url";
import { listComments } from "@/server/queries/comment.queries";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getPostById, getPostMetadataById } from "@/server/queries/post.queries";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { getClientIp } from "@/server/request-context";
import { registerPostView } from "@/server/services/post.service";

type PostDetailPageProps = {
  params?: Promise<{ id?: string }>;
};

const getCachedPostById = cache((id?: string, viewerId?: string) => getPostById(id, viewerId));
const getGuestPostMetadata = unstable_cache(
  (id?: string) => getPostMetadataById(id),
  ["post-meta-guest"],
  { revalidate: 30 },
);

function buildExcerpt(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
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

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const resolvedParams = (await params) ?? {};
  let post: Awaited<ReturnType<typeof getPostMetadataById>> | null = null;
  try {
    post = await getGuestPostMetadata(resolvedParams.id);
  } catch {
    return {
      title: "게시글을 불러올 수 없습니다",
      robots: { index: false, follow: false },
    };
  }
  if (!post) {
    return {
      title: "게시글을 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes().catch(() => []);
  const guestReadable = canGuestReadPost({
    scope: post.scope,
    type: post.type,
    loginRequiredTypes,
  });
  const isIndexable = post.status === "ACTIVE" && guestReadable;
  const description = buildExcerpt(post.content);
  const url = toAbsoluteUrl(`/posts/${post.id}`);
  const imageUrl = post.images[0]?.url
    ? toAbsoluteUrl(post.images[0].url)
    : undefined;

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `/posts/${post.id}`,
    },
    robots: {
      index: isIndexable,
      follow: isIndexable,
    },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

const typeMeta: Record<PostType, { label: string; chipClass: string }> = {
  HOSPITAL_REVIEW: {
    label: "병원후기",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  PLACE_REVIEW: {
    label: "장소후기",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  WALK_ROUTE: {
    label: "산책코스",
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
    label: "반려자랑",
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

function isDatabaseUnavailableError(error: unknown) {
  return error instanceof Prisma.PrismaClientInitializationError;
}

function isRecoverableDatabaseError(error: unknown) {
  if (isDatabaseUnavailableError(error)) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1003", "P1011"].includes(error.code);
  }
  return (
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError
  );
}

const normalizeComments = (commentsRaw: Awaited<ReturnType<typeof listComments>>) =>
  commentsRaw.map((comment) => ({
    ...comment,
    guestDisplayName:
      (comment as { guestDisplayName?: string | null }).guestDisplayName?.trim() ||
      (comment as { guestAuthor?: { displayName?: string | null } | null }).guestAuthor
        ?.displayName ||
      null,
    guestIpDisplay:
      (comment as { guestIpDisplay?: string | null }).guestIpDisplay ??
      (comment as { guestAuthor?: { ipDisplay?: string | null } | null }).guestAuthor?.ipDisplay ??
      null,
    guestIpLabel:
      (comment as { guestIpLabel?: string | null }).guestIpLabel ??
      (comment as { guestAuthor?: { ipLabel?: string | null } | null }).guestAuthor?.ipLabel ??
      null,
    isGuestAuthor:
      Boolean((comment as { guestDisplayName?: string | null }).guestDisplayName) ||
      Boolean(
        (comment as { guestAuthor?: { displayName?: string | null } | null }).guestAuthor
          ?.displayName,
      ) ||
      Boolean((comment as { guestAuthorId?: string | null }).guestAuthorId) ||
      comment.author.email.endsWith("@guest.townpet.local"),
  }));

async function PostCommentSection({
  postId,
  userId,
  canInteract,
  canInteractWithPostOwner,
  loginHref,
}: {
  postId: string;
  userId?: string;
  canInteract: boolean;
  canInteractWithPostOwner: boolean;
  loginHref: string;
}) {
  let commentsRaw: Awaited<ReturnType<typeof listComments>> = [];
  try {
    commentsRaw = await listComments(postId, userId);
  } catch {
    return (
      <div className="mt-6 rounded-sm border border-[#f0d3d3] bg-[#fff7f7] p-4 text-sm text-[#8b4b4b]">
        댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }
  const comments = normalizeComments(commentsRaw);

  return (
    <PostCommentThread
      postId={postId}
      comments={comments}
      currentUserId={userId}
      canInteract={canInteract && canInteractWithPostOwner}
      loginHref={loginHref}
      interactionDisabledMessage={
        canInteract && !canInteractWithPostOwner
          ? "차단 관계에서는 댓글 작성/답글/신고를 사용할 수 없습니다."
          : undefined
      }
    />
  );
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = (await params) ?? {};
  const session = await auth();
  const userId = session?.user?.id;
  const user = userId
    ? await getUserWithNeighborhoods(userId).catch((error) => {
        if (isRecoverableDatabaseError(error)) {
          return null;
        }
        throw error;
      })
    : null;
  let post: Awaited<ReturnType<typeof getPostById>> | null = null;
  let postLoadFailed = false;
  const [postResult, loginRequiredTypes] = await Promise.all([
    getCachedPostById(resolvedParams.id, user?.id).catch((error) => {
      if (isRecoverableDatabaseError(error)) {
        postLoadFailed = true;
        return null;
      }
      throw error;
    }),
    getGuestReadLoginRequiredPostTypes().catch((error) => {
      if (isRecoverableDatabaseError(error)) {
        return [];
      }
      throw error;
    }),
  ]);
  post = postResult;

  if (postLoadFailed) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7ff_0%,#eef4ff_100%)] pb-16">
        <main className="mx-auto flex max-w-[1000px] flex-col gap-4 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="rounded-sm border border-[#f0d3d3] bg-white p-6 text-center">
            <h2 className="text-lg font-semibold text-[#153a6a]">게시글을 불러오지 못했습니다.</h2>
            <p className="mt-2 text-sm text-[#5a7398]">잠시 후 다시 시도해 주세요.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    notFound();
  }

  if (
    !user &&
    !canGuestReadPost({
      scope: post.scope,
      type: post.type,
      loginRequiredTypes: loginRequiredTypes,
    })
  ) {
    return (
      <NeighborhoodGateNotice
        title="로그인이 필요한 게시글입니다."
        description="이 게시글은 로그인 사용자에게만 공개됩니다."
        secondaryLink={`/login?next=${encodeURIComponent(`/posts/${post.id}`)}`}
        secondaryLabel="로그인하기"
      />
    );
  }

  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  if (user && !primaryNeighborhood && post.scope !== "GLOBAL") {
    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="동네를 설정해야 로컬 게시물을 볼 수 있습니다."
        secondaryLink="/feed?scope=GLOBAL"
        secondaryLabel="온동네 피드 보기"
      />
    );
  }

  const canInteract = Boolean(user);
  const loginHref = `/login?next=${encodeURIComponent(`/posts/${post.id}`)}`;
  const isAuthor = user?.id === post.authorId;
  const guestPostMeta = post as {
    guestDisplayName?: string | null;
    guestAuthor?: { displayName?: string | null } | null;
    guestAuthorId?: string | null;
  };
  const guestIpMeta = post as {
    guestIpDisplay?: string | null;
    guestIpLabel?: string | null;
    guestAuthor?: { ipDisplay?: string | null; ipLabel?: string | null } | null;
  };
  const resolvedGuestIpDisplay =
    guestIpMeta.guestIpDisplay ?? guestIpMeta.guestAuthor?.ipDisplay ?? null;
  const resolvedGuestIpLabel = guestIpMeta.guestIpLabel ?? guestIpMeta.guestAuthor?.ipLabel ?? null;
  const resolvedGuestAuthorName =
    guestPostMeta.guestDisplayName?.trim() || guestPostMeta.guestAuthor?.displayName?.trim() || "";
  const isGuestPost = Boolean(resolvedGuestAuthorName) || Boolean(guestPostMeta.guestAuthorId);
  const displayAuthorName = resolvedGuestAuthorName
    ? resolvedGuestAuthorName
    : post.author.nickname ?? post.author.name ?? "익명";
  const relationState =
    canInteract && !isAuthor
      ? await getUserRelationState(user?.id, post.authorId).catch(() => ({
          isBlockedByMe: false,
          hasBlockedMe: false,
          isMutedByMe: false,
        }))
      : {
          isBlockedByMe: false,
          hasBlockedMe: false,
          isMutedByMe: false,
        };
  const canInteractWithPostOwner =
    isAuthor || (!relationState.isBlockedByMe && !relationState.hasBlockedMe);
  const postUrl = toAbsoluteUrl(`/posts/${post.id}`);
  const meta = typeMeta[post.type];
  const requestHeaders = await headers();
  void registerPostView({
    postId: post.id,
    userId: user?.id,
    clientIp: getClientIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  }).catch(() => undefined);
  const safeViewCount = Number.isFinite(post.viewCount)
    ? Number(post.viewCount)
    : 0;
  const safeLikeCount = Number.isFinite(post.likeCount) ? Number(post.likeCount) : 0;
  const safeDislikeCount = Number.isFinite(post.dislikeCount)
    ? Number(post.dislikeCount)
    : 0;
  const safeCommentCount = Number.isFinite(post.commentCount)
    ? Number(post.commentCount)
    : 0;
  const renderedContentHtml = renderLiteMarkdown(post.content);
  const renderedContentText = renderedContentHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const shouldUsePlainFallback =
    renderedContentText.length === 0 ||
    renderedContentText.includes("미리보기 내용이 없습니다");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: post.title,
    articleBody: buildExcerpt(post.content, 320),
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: postUrl,
    author: {
      "@type": "Person",
      name: post.author.nickname ?? post.author.name ?? "익명",
    },
    image: post.images.map((image) => toAbsoluteUrl(image.url)),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: safeLikeCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: safeCommentCount,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7ff_0%,#eef4ff_100%)] pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <BackToFeedButton
          className="inline-flex w-fit items-center rounded-sm border border-[#bfd0ec] bg-white px-3.5 py-2 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
        />

        <div>
          <section className="rounded-md border border-[#c8d7ef] bg-white p-4 shadow-[0_10px_24px_rgba(16,40,74,0.06)] sm:p-7">
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

            <div className="mt-3 grid gap-3 border-b border-[#e0e9f5] pb-4 md:mt-4 md:gap-4 md:pb-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
              <div>
                <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-[#10284a] sm:text-[42px]">
                  {post.title}
                </h1>
              </div>
              <div className="text-sm text-[#4f678d] md:text-right">
                <div className="flex items-start justify-between gap-3 md:flex-col md:items-end">
                  <p className="font-semibold text-[#1f3f71]">
                    {isGuestPost ? (
                      <span>
                        {displayAuthorName}
                        {resolvedGuestIpDisplay
                          ? ` (${resolvedGuestIpLabel ?? "아이피"} ${resolvedGuestIpDisplay})`
                          : ""}
                      </span>
                    ) : (
                      <Link href={`/users/${post.author.id}`} className="hover:text-[#2f5da4]">
                        {displayAuthorName}
                      </Link>
                    )}
                  </p>
                  <p className="text-[12px] text-[#5a759c]">{formatRelativeDate(post.createdAt)}</p>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[#5f7da8] md:justify-end">
                  <span>조회 {safeViewCount.toLocaleString()}</span>
                  <span>좋아요 {safeLikeCount.toLocaleString()}</span>
                  <span>싫어요 {safeDislikeCount.toLocaleString()}</span>
                  <span>댓글 {safeCommentCount.toLocaleString()}</span>
                </p>
                <details className="mt-1 text-[11px] text-[#6b84ab] md:text-right">
                  <summary className="cursor-pointer list-none font-semibold text-[#5878a2]">상세 정보</summary>
                  <p className="mt-1 leading-5">
                    {post.createdAt.toLocaleDateString("ko-KR")} · {post.scope === "LOCAL" ? "동네" : "온동네"} ·{" "}
                    {post.neighborhood ? `${post.neighborhood.city} ${post.neighborhood.name}` : "전체"}
                  </p>
                </details>
                {canInteract && !isAuthor ? (
                  <div className="mt-2 md:flex md:justify-end">
                    <UserRelationControls
                      targetUserId={post.authorId}
                      initialState={relationState}
                      compact
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <section className="mt-3 rounded-sm border border-[#dbe6f6] bg-[#fcfdff] px-3 py-3.5 sm:mt-4 sm:px-5 sm:py-4">
              <h2 className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-[#4f6f9f]">
                내용
              </h2>
              <article className="text-[16px] leading-8 text-[#17345f]">
                {shouldUsePlainFallback ? (
                  <div className="whitespace-pre-wrap">{post.content}</div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
                  />
                )}

                {post.images.length > 0 ? (
                  <div className="mt-5 border border-[#dbe6f6] bg-[#f8fbff] px-3 py-2.5">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-[#4f6f9f]">첨부파일</p>
                    <ul className="mt-2 space-y-1">
                      {post.images.map((image, index) => {
                        const fileName = extractAttachmentName(image.url, index);
                        return (
                          <li key={image.id} className="text-sm">
                            <Link
                              href={image.url}
                              target="_blank"
                              className="text-[#2f5da4] underline decoration-[#9db8df] underline-offset-2 hover:text-[#254e8a]"
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

            <div className="mt-3 space-y-2 border-b border-[#e0e9f5] pb-3 sm:mt-4 sm:space-y-3 sm:pb-4">
              <div className="rounded-sm border border-[#d8e4f6] bg-[#f8fbff] px-2.5 py-2.5 sm:px-3 sm:py-3">
                <div className="flex items-center justify-between gap-2">
                  <PostReactionControls
                    postId={post.id}
                    likeCount={safeLikeCount}
                    dislikeCount={safeDislikeCount}
                    currentReaction={post.reactions?.[0]?.type ?? null}
                    canReact={canInteract && canInteractWithPostOwner}
                    loginHref={loginHref}
                  />
                  <PostShareControls url={postUrl} title={post.title} />
                </div>
              </div>
              {isAuthor ? (
                <>
                  <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
                    >
                      수정
                    </Link>
                    <PostDetailActions postId={post.id} />
                  </div>
                  <details className="sm:hidden">
                    <summary className="inline-flex h-8 items-center rounded-sm border border-[#bfd0ec] bg-white px-3 text-xs font-semibold text-[#315484]">
                      글 관리
                    </summary>
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-[#dbe6f6] bg-[#f8fbff] p-2">
                      <Link
                        href={`/posts/${post.id}/edit`}
                        className="inline-flex h-8 items-center border border-[#bfd0ec] bg-white px-3 text-xs font-semibold text-[#315484]"
                      >
                        수정
                      </Link>
                      <PostDetailActions postId={post.id} />
                    </div>
                  </details>
                </>
              ) : null}
              {!canInteract && isGuestPost ? (
                <GuestPostDetailActions postId={post.id} />
              ) : null}
            </div>

            {canInteract && !isAuthor && !canInteractWithPostOwner ? (
              <div className="mt-4 border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                차단 관계에서는 댓글/반응/신고 기능을 사용할 수 없습니다.
              </div>
            ) : null}

            {canInteract && !isAuthor && canInteractWithPostOwner ? (
              <details className="mt-4 border border-[#c8d7ef] bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#1f3f71]">
                  게시글 신고
                </summary>
                <div className="mt-3">
                  <PostReportForm postId={post.id} />
                </div>
              </details>
            ) : null}

          </section>
        </div>

        {post.hospitalReview ? (
          <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[#163462]">병원후기 상세</h2>
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
            <h2 className="text-lg font-semibold text-[#163462]">장소후기 상세</h2>
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
            <h2 className="text-lg font-semibold text-[#163462]">산책코스 상세</h2>
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

        <Suspense
          fallback={
            <div className="mt-6 rounded-sm border border-[#dbe6f6] bg-white p-4 text-sm text-[#6a84ac]">
              댓글을 불러오는 중...
            </div>
          }
        >
          <PostCommentSection
            postId={post.id}
            userId={user?.id}
            canInteract={canInteract}
            canInteractWithPostOwner={canInteractWithPostOwner}
            loginHref={loginHref}
          />
        </Suspense>
      </main>
    </div>
  );
}
