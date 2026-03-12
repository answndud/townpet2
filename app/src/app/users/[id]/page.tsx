import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { RouteRefreshOnReturn } from "@/components/ui/route-refresh-on-return";
import { PublicProfileSummaryStats } from "@/components/user/public-profile-summary-stats";
import { UserRelationControls } from "@/components/user/user-relation-controls";
import { auth } from "@/lib/auth";
import { getCspNonce } from "@/lib/csp-nonce";
import { buildPaginationWindow, parsePositivePage } from "@/lib/pagination";
import {
  buildPublicProfileTabHref,
  buildPublicProfileLoginHref,
  resolvePublicProfileTab,
} from "@/lib/public-profile";
import {
  getPetBreedDisplayLabel,
  getPetLifeStageLabel,
  getPetSizeClassLabel,
  getPetSpeciesLabel,
  hasBreedLoungeRoute,
} from "@/lib/pet-profile";
import { formatRelativeDate } from "@/lib/post-presenter";
import { toAbsoluteUrl } from "@/lib/site-url";
import { resolveUserDisplayName } from "@/lib/user-display";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import {
  getPublicUserProfileById,
  listPetsByUserId,
  listPublicUserComments,
  listPublicUserPosts,
  listPublicUserReactions,
} from "@/server/queries/user.queries";

type UserProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string; page?: string }>;
};

type ActivityTab = "posts" | "comments" | "reactions";

const getCachedSession = cache(async () => auth());
const getCachedPublicUserProfile = cache(async (id: string) => getPublicUserProfileById(id));
const getCachedUserRelationState = cache(async (viewerId: string, profileId: string) =>
  getUserRelationState(viewerId, profileId),
);

function toTab(value?: string): ActivityTab {
  if (value === "comments" || value === "reactions") {
    return value;
  }
  return "posts";
}

function buildBioExcerpt(text: string, maxLength = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const session = await getCachedSession();
  if (!session?.user?.id) {
    return {
      title: "로그인이 필요합니다",
      description: "프로필을 보려면 로그인해 주세요.",
      robots: { index: false, follow: false },
    };
  }
  const profile = await getCachedPublicUserProfile(resolvedParams.id);

  if (!profile) {
    return {
      title: "사용자를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const relationState = await getCachedUserRelationState(session.user.id, profile.id);
  if (relationState.isBlockedByMe || relationState.hasBlockedMe) {
    return {
      title: "사용자를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const displayName = resolveUserDisplayName(profile.nickname, "익명 사용자");
  const description = profile.bio?.trim()
    ? buildBioExcerpt(profile.bio)
    : `${displayName}님의 TownPet 활동 프로필`;
  const url = toAbsoluteUrl(`/users/${profile.id}`);

  return {
    title: `${displayName} 프로필`,
    description,
    alternates: {
      canonical: `/users/${profile.id}`,
    },
    openGraph: {
      type: "profile",
      title: `${displayName} 프로필`,
      description,
      url,
      images: profile.image ? [{ url: toAbsoluteUrl(profile.image) }] : undefined,
    },
    twitter: {
      card: profile.image ? "summary_large_image" : "summary",
      title: `${displayName} 프로필`,
      description,
      images: profile.image ? [toAbsoluteUrl(profile.image)] : undefined,
    },
  };
}

export default async function PublicUserProfilePage({
  params,
  searchParams,
}: UserProfilePageProps) {
  const cspNonce = await getCspNonce();
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const tab = toTab((resolvedSearchParams as { tab?: string } | undefined)?.tab);
  const currentPage = parsePositivePage(
    (resolvedSearchParams as { page?: string } | undefined)?.page,
  );

  const session = await getCachedSession();
  const viewerId = session?.user?.id;
  if (!viewerId) {
    redirect(buildPublicProfileLoginHref(id));
  }
  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: session?.user?.nickname,
  });

  if (viewerId === id) {
    redirect("/profile");
  }

  const profile = await getCachedPublicUserProfile(id);
  if (!profile) {
    notFound();
  }
  const displayName = resolveUserDisplayName(profile.nickname, "익명 사용자");

  const relationState = await getCachedUserRelationState(viewerId, profile.id);
  if (relationState.isBlockedByMe || relationState.hasBlockedMe) {
    notFound();
  }
  const resolvedTab = resolvePublicProfileTab(tab, {
    showPublicPosts: profile.showPublicPosts,
    showPublicComments: profile.showPublicComments,
    showPublicPets: profile.showPublicPets,
  });
  if (resolvedTab !== tab) {
    redirect(buildPublicProfileTabHref(profile.id, resolvedTab));
  }

  const [postsPage, commentsPage, reactionsPage, pets] = await Promise.all([
    resolvedTab === "posts" && profile.showPublicPosts
      ? listPublicUserPosts({ userId: profile.id, limit: 20, page: currentPage })
      : Promise.resolve({ items: [], nextCursor: null, page: 1, totalPages: 1, totalCount: 0 }),
    resolvedTab === "comments" && profile.showPublicComments
      ? listPublicUserComments({ userId: profile.id, limit: 20, page: currentPage })
      : Promise.resolve({ items: [], nextCursor: null, page: 1, totalPages: 1, totalCount: 0 }),
    resolvedTab === "reactions"
      ? listPublicUserReactions({ userId: profile.id, limit: 20, page: currentPage })
      : Promise.resolve({ items: [], nextCursor: null, page: 1, totalPages: 1, totalCount: 0 }),
    profile.showPublicPets ? listPetsByUserId(profile.id) : Promise.resolve([]),
  ]);
  const posts = postsPage.items;
  const comments = commentsPage.items;
  const reactions = reactionsPage.items;
  const tabPage =
    resolvedTab === "posts"
      ? postsPage.page
      : resolvedTab === "comments"
        ? commentsPage.page
        : reactionsPage.page;
  const tabTotalPages =
    resolvedTab === "posts"
      ? postsPage.totalPages
      : resolvedTab === "comments"
        ? commentsPage.totalPages
        : reactionsPage.totalPages;

  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    description: profile.bio ?? undefined,
    image: profile.image ? toAbsoluteUrl(profile.image) : undefined,
    url: toAbsoluteUrl(`/users/${profile.id}`),
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <script
        nonce={cspNonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <RouteRefreshOnReturn refreshOnFocus={false} />
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">공개 프로필</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            {displayName}
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            가입일 {profile.createdAt.toLocaleDateString("ko-KR")}
          </p>
          <p className="mt-3 text-sm text-[#355988]">
            {profile.bio?.trim() ? profile.bio : "등록된 소개가 없습니다."}
          </p>
          <div className="mt-4">
            <UserRelationControls
              key={`${profile.id}:${relationState.isBlockedByMe ? "1" : "0"}:${relationState.isMutedByMe ? "1" : "0"}:${relationState.hasBlockedMe ? "1" : "0"}`}
              targetUserId={profile.id}
              initialState={relationState}
            />
          </div>
        </header>

        <PublicProfileSummaryStats
          key={`${profile.id}:${profile.showPublicPosts ? "1" : "0"}:${profile.showPublicComments ? "1" : "0"}:${profile.postCount ?? "hidden"}:${profile.commentCount ?? "hidden"}:${profile.reactionCount}`}
          userId={profile.id}
          initialSummary={{
            showPublicPosts: profile.showPublicPosts,
            showPublicComments: profile.showPublicComments,
            postCount: profile.postCount,
            commentCount: profile.commentCount,
            reactionCount: profile.reactionCount,
          }}
        />

        <section className="tp-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">반려동물 프로필</h2>
          {!profile.showPublicPets ? (
            <p className="mt-3 text-sm text-[#5a7398]">
              이 사용자는 반려동물 프로필을 공개하지 않습니다.
            </p>
          ) : pets.length === 0 ? (
            <p className="mt-3 text-sm text-[#5a7398]">등록된 반려동물 프로필이 없습니다.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {pets.map((pet) => {
                const breedDisplay = getPetBreedDisplayLabel({
                  breedCode: pet.breedCode,
                  breedLabel: pet.breedLabel,
                });
                const sizeLabel = getPetSizeClassLabel(pet.sizeClass);
                const lifeStageLabel = getPetLifeStageLabel(pet.lifeStage);
                const hasBreedLounge = hasBreedLoungeRoute(pet.breedCode);

                return (
                  <article key={pet.id} className="border border-[#dbe5f3] bg-[#f8fbff] p-3">
                    <div className="flex items-start gap-3">
                    {pet.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pet.imageUrl}
                        alt={`${pet.name} 프로필 이미지`}
                        loading="lazy"
                        className="h-12 w-12 border border-[#cbdcf5] object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center border border-[#cbdcf5] bg-white text-[10px] font-semibold text-[#5b78a1]">
                        PET
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1f3f71]">{pet.name}</p>
                        <p className="text-xs text-[#4f678d]">
                          {getPetSpeciesLabel(pet.species)}
                          {breedDisplay ? ` · ${breedDisplay}` : ""}
                          {sizeLabel ? ` · ${sizeLabel}` : ""}
                          {lifeStageLabel ? ` · ${lifeStageLabel}` : ""}
                          {pet.weightKg !== null ? ` · ${pet.weightKg}kg` : ""}
                          {pet.birthYear !== null ? ` · ${pet.birthYear}년생` : ""}
                        </p>
                        {hasBreedLounge ? (
                          <Link
                            href={`/lounges/breeds/${pet.breedCode}`}
                            className="mt-2 inline-flex text-[11px] font-semibold text-[#2f5da4] hover:text-[#244b86]"
                          >
                            품종 라운지 보기
                          </Link>
                        ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[#5a7398]">
                    {pet.bio?.trim() ? pet.bio : "소개가 없습니다."}
                  </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="tp-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {profile.showPublicPosts ? (
              <Link
                href={buildPublicProfileTabHref(profile.id, "posts")}
                className={`rounded-lg border px-3 py-1.5 ${
                  resolvedTab === "posts"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a]"
                }`}
              >
                게시글 활동
              </Link>
            ) : null}
            {profile.showPublicComments ? (
              <Link
                href={buildPublicProfileTabHref(profile.id, "comments")}
                className={`rounded-lg border px-3 py-1.5 ${
                  resolvedTab === "comments"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a]"
                }`}
              >
                댓글 활동
              </Link>
            ) : null}
            <Link
              href={buildPublicProfileTabHref(profile.id, "reactions")}
              className={`rounded-lg border px-3 py-1.5 ${
                resolvedTab === "reactions"
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#cbdcf5] bg-white text-[#315b9a]"
              }`}
            >
              반응 활동
            </Link>
          </div>

          {resolvedTab === "posts" ? (
            <div className="mt-4 divide-y divide-[#e1e9f5]">
              {posts.length === 0 ? (
                <p className="py-6 text-sm text-[#5a7398]">게시글 활동이 없습니다.</p>
              ) : (
                posts.map((post) => (
                  <article key={post.id} className="py-3">
                    <Link href={`/posts/${post.id}`} className="font-semibold text-[#163462] hover:text-[#2f5da4]">
                      {post.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#5a7398]">
                      {formatRelativeDate(post.createdAt)} · 좋아요 {post.likeCount} · 댓글{" "}
                      {post.commentCount}
                    </p>
                  </article>
                ))
              )}
              {tabTotalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
                  <Link
                    href={buildPublicProfileTabHref(profile.id, "posts", Math.max(1, tabPage - 1))}
                    aria-disabled={tabPage <= 1}
                    className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-semibold transition ${
                      tabPage <= 1
                        ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                        : "border-[#cbdcf5] bg-white text-[#315b9a]"
                    }`}
                  >
                    이전
                  </Link>
                  {buildPaginationWindow(tabPage, tabTotalPages).map((pageNumber) => (
                    <Link
                      key={`public-profile-post-page-${pageNumber}`}
                      href={buildPublicProfileTabHref(profile.id, "posts", pageNumber)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
                        pageNumber === tabPage
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#cbdcf5] bg-white text-[#315b9a]"
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  ))}
                  <Link
                    href={buildPublicProfileTabHref(profile.id, "posts", Math.min(tabTotalPages, tabPage + 1))}
                    aria-disabled={tabPage >= tabTotalPages}
                    className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-semibold transition ${
                      tabPage >= tabTotalPages
                        ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                        : "border-[#cbdcf5] bg-white text-[#315b9a]"
                    }`}
                  >
                    다음
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {resolvedTab === "comments" ? (
            <div className="mt-4 divide-y divide-[#e1e9f5]">
              {comments.length === 0 ? (
                <p className="py-6 text-sm text-[#5a7398]">댓글 활동이 없습니다.</p>
              ) : (
                comments.map((comment) => (
                  <article key={comment.id} className="py-3">
                    <Link
                      href={`/posts/${comment.post.id}#comment-${comment.id}`}
                      className="font-semibold text-[#163462] hover:text-[#2f5da4]"
                    >
                      {comment.post.title}
                    </Link>
                    <p className="mt-1 text-sm text-[#355988]">
                      {comment.content.length > 100
                        ? `${comment.content.slice(0, 100)}...`
                        : comment.content}
                    </p>
                    <p className="mt-1 text-xs text-[#5a7398]">{formatRelativeDate(comment.createdAt)}</p>
                  </article>
                ))
              )}
              {tabTotalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
                  <Link
                    href={buildPublicProfileTabHref(profile.id, "comments", Math.max(1, tabPage - 1))}
                    aria-disabled={tabPage <= 1}
                    className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-semibold transition ${
                      tabPage <= 1
                        ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                        : "border-[#cbdcf5] bg-white text-[#315b9a]"
                    }`}
                  >
                    이전
                  </Link>
                  {buildPaginationWindow(tabPage, tabTotalPages).map((pageNumber) => (
                    <Link
                      key={`public-profile-comment-page-${pageNumber}`}
                      href={buildPublicProfileTabHref(profile.id, "comments", pageNumber)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
                        pageNumber === tabPage
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#cbdcf5] bg-white text-[#315b9a]"
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  ))}
                  <Link
                    href={buildPublicProfileTabHref(profile.id, "comments", Math.min(tabTotalPages, tabPage + 1))}
                    aria-disabled={tabPage >= tabTotalPages}
                    className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-semibold transition ${
                      tabPage >= tabTotalPages
                        ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                        : "border-[#cbdcf5] bg-white text-[#315b9a]"
                    }`}
                  >
                    다음
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {resolvedTab === "reactions" ? (
            <div className="mt-4 divide-y divide-[#e1e9f5]">
              {reactions.length === 0 ? (
                <p className="py-6 text-sm text-[#5a7398]">반응 활동이 없습니다.</p>
              ) : (
                reactions.map((reaction) => (
                  <article key={reaction.id} className="py-3">
                    <Link href={`/posts/${reaction.post.id}`} className="font-semibold text-[#163462] hover:text-[#2f5da4]">
                      {reaction.post.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#5a7398]">
                      {reaction.type === "LIKE" ? "좋아요" : "싫어요"} ·{" "}
                      {formatRelativeDate(reaction.createdAt)} · 작성자{" "}
                      {resolveUserDisplayName(reaction.post.author.nickname)}
                    </p>
                  </article>
                ))
              )}
              {tabTotalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
                  <Link
                    href={buildPublicProfileTabHref(profile.id, "reactions", Math.max(1, tabPage - 1))}
                    aria-disabled={tabPage <= 1}
                    className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-semibold transition ${
                      tabPage <= 1
                        ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                        : "border-[#cbdcf5] bg-white text-[#315b9a]"
                    }`}
                  >
                    이전
                  </Link>
                  {buildPaginationWindow(tabPage, tabTotalPages).map((pageNumber) => (
                    <Link
                      key={`public-profile-reaction-page-${pageNumber}`}
                      href={buildPublicProfileTabHref(profile.id, "reactions", pageNumber)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
                        pageNumber === tabPage
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#cbdcf5] bg-white text-[#315b9a]"
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  ))}
                  <Link
                    href={buildPublicProfileTabHref(profile.id, "reactions", Math.min(tabTotalPages, tabPage + 1))}
                    aria-disabled={tabPage >= tabTotalPages}
                    className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-semibold transition ${
                      tabPage >= tabTotalPages
                        ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
                        : "border-[#cbdcf5] bg-white text-[#315b9a]"
                    }`}
                  >
                    다음
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
