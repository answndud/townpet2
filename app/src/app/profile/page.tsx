import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildDefaultBreedCatalogBySpecies } from "@/lib/breed-catalog";
import { getPasswordSetupCopy } from "@/lib/password-setup";
import {
  canManagePassword,
  getPasswordManagementNoticeMessage,
  getPasswordManagementUnavailableMessage,
} from "@/lib/password-management";
import { isSocialDevLoginEnabled } from "@/lib/env";
import { getSocialAccountNoticeMessage } from "@/lib/social-auth";
import { NeighborhoodPreferenceForm } from "@/components/profile/neighborhood-preference-form";
import { PetProfileManager } from "@/components/profile/pet-profile-manager";
import { ProfileImageUploader } from "@/components/profile/profile-image-uploader";
import { ProfileInfoForm } from "@/components/profile/profile-info-form";
import { ProfileSocialAccountConnections } from "@/components/profile/profile-social-account-connections";
import { ProfileSummaryLinkCard } from "@/components/profile/profile-summary-link-card";
import { UserRelationControls } from "@/components/user/user-relation-controls";
import { auth } from "@/lib/auth";
import {
  getPetLifeStageLabel,
  getPetSizeClassLabel,
  hasBreedLoungeRoute,
} from "@/lib/pet-profile";
import { listAudienceSegmentsByUserId } from "@/server/queries/audience-segment.queries";
import { listBreedCatalogGroupedBySpecies } from "@/server/queries/breed-catalog.queries";
import {
  getUserPasswordStatusById,
  getUserWithNeighborhoods,
  listPetsByUserId,
} from "@/server/queries/user.queries";
import { countUserBookmarkedPosts, countUserPosts } from "@/server/queries/post.queries";
import { listMyBlockedUsers, listMyMutedUsers } from "@/server/queries/user-relation.queries";

type ProfilePageProps = {
  searchParams?: Promise<{
    notice?: string;
  }>;
};

export const metadata: Metadata = {
  title: "내 프로필",
  description: "계정 활동, 동네 설정, 반려동물 정보를 관리합니다.",
  alternates: {
    canonical: "/profile",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const user = await getUserWithNeighborhoods(userId);
  if (!user) {
    redirect("/login");
  }

  const passwordStatus = await getUserPasswordStatusById(userId);
  const canShowPasswordSetupLink = canManagePassword({
    authProvider: session.user?.authProvider,
    hasPassword: passwordStatus?.hasPassword ?? true,
    linkedAccountProviders: passwordStatus?.linkedAccountProviders ?? [],
  });
  const passwordSetupCopy = canShowPasswordSetupLink
    ? getPasswordSetupCopy(passwordStatus?.hasPassword ?? true)
    : null;
  const passwordManagementNotice = getPasswordManagementNoticeMessage(
    resolvedSearchParams.notice ?? null,
  );
  const socialAccountNotice = getSocialAccountNoticeMessage(
    resolvedSearchParams.notice ?? null,
  );
  const accountNotice = passwordManagementNotice ?? socialAccountNotice;
  const isLocalPreview = process.env.NODE_ENV !== "production";
  const socialDevEnabled = isSocialDevLoginEnabled();
  const kakaoEnabledByEnv = Boolean(
    process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET,
  );
  const naverEnabledByEnv = Boolean(
    process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET,
  );
  const kakaoEnabled = kakaoEnabledByEnv || (isLocalPreview && socialDevEnabled);
  const naverEnabled = naverEnabledByEnv || (isLocalPreview && socialDevEnabled);

  const isNicknameMissing = !user.nickname?.trim();
  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);

  const [postCount, bookmarkedPostCount] = await Promise.all([
    countUserPosts({ authorId: user.id }),
    countUserBookmarkedPosts({ userId: user.id }),
  ]);
  let blockedUsers = [] as Awaited<ReturnType<typeof listMyBlockedUsers>>;
  let mutedUsers = [] as Awaited<ReturnType<typeof listMyMutedUsers>>;
  let pets = [] as Awaited<ReturnType<typeof listPetsByUserId>>;
  let audienceSegments = [] as Awaited<ReturnType<typeof listAudienceSegmentsByUserId>>;
  let breedCatalogBySpecies = buildDefaultBreedCatalogBySpecies();

  if (!isNicknameMissing) {
    [blockedUsers, mutedUsers, pets, audienceSegments, breedCatalogBySpecies] = await Promise.all([
      listMyBlockedUsers(user.id),
      listMyMutedUsers(user.id),
      listPetsByUserId(user.id),
      listAudienceSegmentsByUserId(user.id),
      listBreedCatalogGroupedBySpecies(),
    ]);
  }

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="tp-eyebrow">내 프로필</p>
          <h1 className="tp-text-page-title tp-text-primary mt-2">
            계정 활동 요약
          </h1>
          <p className="tp-text-muted mt-2 text-sm">
            작성 내역과 동네 설정 상태를 한눈에 확인할 수 있습니다.
          </p>

          <div className="mt-4 flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt="프로필 이미지"
                width={56}
                height={56}
                className="tp-border-soft h-14 w-14 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#cbdcf5] bg-[radial-gradient(circle_at_top,#ffffff,transparent_60%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] text-[#5b78a1] shadow-[0_8px_18px_rgba(53,103,181,0.10)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 48 48"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="24" cy="19" r="7" />
                  <path d="M12 38c2.8-6.1 8-9.2 12-9.2s9.2 3.1 12 9.2" />
                </svg>
                <span className="sr-only">프로필 이미지 없음</span>
              </div>
            )}
            <p className="tp-text-subtle text-xs">프로필 사진은 내 프로필 섹션에서 수정할 수 있습니다.</p>
          </div>
        </header>

        {isNicknameMissing ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <h2 className="tp-text-section-title">닉네임 설정이 필요합니다.</h2>
            <p className="mt-1">
              현재 계정은 닉네임이 없어 다른 페이지로 이동할 수 없습니다. 아래
              <span className="font-semibold"> 프로필 정보 수정</span>에서 닉네임을 저장하면
              피드/커뮤니티 이동이 즉시 가능합니다.
            </p>
            <p className="mt-2 text-xs">
              닉네임은 중복 사용할 수 없으며, 설정/변경 후 30일 동안 다시 변경할 수 없습니다.
            </p>
          </section>
        ) : null}

        {accountNotice ? (
          <section className="tp-border-soft tp-surface-soft tp-text-accent rounded-xl border px-4 py-4 text-sm">
            {accountNotice}
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2">
          <ProfileSummaryLinkCard
            href="/my-posts"
            eyebrow="내 작성글"
            count={postCount}
            label="작성한 게시글"
            description="카테고리별로 내가 작성한 글을 모아 확인할 수 있습니다."
          />
          <ProfileSummaryLinkCard
            href="/bookmarks"
            eyebrow="북마크"
            count={bookmarkedPostCount}
            label="북마크한 글"
            description="다시 보고 싶은 글을 한곳에서 빠르게 확인할 수 있습니다."
          />
        </section>

        <section className="tp-card p-5 sm:p-6">
          <h2 className="tp-text-section-title tp-text-heading">계정 정보</h2>
          <div className="tp-text-muted mt-4 grid gap-2 text-sm">
            <div>닉네임: {user.nickname ?? "미설정"}</div>
            <div>소개: {user.bio?.trim() ? user.bio : "미설정"}</div>
            <div className="break-all">이메일: {user.email}</div>
            <div>
              대표 동네: {primaryNeighborhood
                ? `${primaryNeighborhood.neighborhood.city} ${primaryNeighborhood.neighborhood.name}`
                : "미설정"}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {passwordSetupCopy ? (
              <Link
                href="/password/setup"
                className="tp-btn-soft tp-btn-sm tp-text-accent"
              >
                {passwordSetupCopy.profileLinkLabel}
              </Link>
            ) : (
              <p className="tp-text-subtle text-[11px]">
                {getPasswordManagementUnavailableMessage()}
              </p>
            )}
          </div>
        </section>

        <ProfileSocialAccountConnections
          authProvider={session.user?.authProvider}
          hasPassword={passwordStatus?.hasPassword ?? false}
          linkedAccountProviders={passwordStatus?.linkedAccountProviders ?? []}
          kakaoEnabled={kakaoEnabled}
          kakaoDevMode={isLocalPreview && !kakaoEnabledByEnv && socialDevEnabled}
          naverEnabled={naverEnabled}
          naverDevMode={isLocalPreview && !naverEnabledByEnv && socialDevEnabled}
          socialDevEnabled={socialDevEnabled}
        />

        <ProfileInfoForm
          initialNickname={user.nickname}
          initialBio={user.bio}
          initialShowPublicPosts={user.showPublicPosts}
          initialShowPublicComments={user.showPublicComments}
          initialShowPublicPets={user.showPublicPets}
        />
        {!isNicknameMissing ? (
          <>
            <NeighborhoodPreferenceForm
              selectedNeighborhoods={user.neighborhoods.map((item) => item.neighborhood)}
              primaryNeighborhoodId={primaryNeighborhood?.neighborhood.id ?? null}
            />
            <ProfileImageUploader initialImageUrl={user.image} />
            <PetProfileManager
              pets={pets}
              breedCatalogBySpecies={breedCatalogBySpecies}
            />
            <section className="tp-card p-5 sm:p-6">
              <h2 className="tp-text-section-title tp-text-heading">개인화 세그먼트</h2>
              <p className="tp-text-subtle mt-2 text-xs">
                반려동물 프로필에서 계산한 맞춤 피드/품종 라운지 기준입니다.
              </p>
              {audienceSegments.length === 0 ? (
                <p className="tp-text-subtle mt-4 text-sm">
                  반려동물 프로필에 품종, 체급, 생애단계를 입력하면 맞춤 세그먼트가 생성됩니다.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {audienceSegments.map((segment) => (
                    <article
                      key={segment.id}
                      className="tp-border-soft tp-surface-soft rounded-lg border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="tp-text-card-title tp-text-heading">{segment.label}</p>
                        <span className="tp-border-soft tp-text-accent rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold">
                          신뢰도 {Math.round(segment.confidenceScore * 100)}%
                        </span>
                      </div>
                      <p className="tp-text-subtle mt-1 text-xs">
                        {[
                          segment.breedCode ? `품종 ${segment.breedCode}` : null,
                          getPetSizeClassLabel(segment.sizeClass),
                          getPetLifeStageLabel(segment.lifeStage),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "반려동물 프로필 기반 직접 신호"}
                      </p>
                      {hasBreedLoungeRoute(segment.breedCode) ? (
                        <Link
                          href={`/lounges/breeds/${segment.breedCode}`}
                          className="tp-btn-soft tp-btn-sm tp-text-link mt-3 inline-flex"
                        >
                          품종 라운지 보기
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="tp-card p-5 sm:p-6">
              <h2 className="tp-text-section-title tp-text-heading">사용자 관계 관리</h2>
              <p className="tp-text-subtle mt-2 text-xs">
                차단/뮤트한 사용자를 여기서 바로 해제할 수 있습니다.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="tp-soft-card p-4">
                  <h3 className="tp-text-card-title tp-text-heading">
                    차단 목록 ({blockedUsers.length})
                  </h3>
                  {blockedUsers.length === 0 ? (
                    <p className="tp-text-subtle mt-3 text-xs">차단한 사용자가 없습니다.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {blockedUsers.map((entry) => (
                        <div
                          key={entry.id}
                          className="tp-border-soft tp-text-accent rounded-lg border bg-white px-3 py-2 text-xs"
                        >
                          <p className="tp-text-heading break-all font-semibold">
                            {entry.blocked?.nickname ?? entry.blocked?.email ?? entry.blockedId}
                          </p>
                          <p className="tp-text-subtle mt-0.5 text-[11px]">
                            {entry.createdAt.toLocaleString("ko-KR")}
                          </p>
                          <div className="mt-2">
                            <UserRelationControls
                              key={`${entry.blockedId}:1:${mutedUsers.some((mute) => mute.mutedUserId === entry.blockedId) ? "1" : "0"}:0`}
                              targetUserId={entry.blockedId}
                              initialState={{
                                isBlockedByMe: true,
                                hasBlockedMe: false,
                                isMutedByMe: mutedUsers.some(
                                  (mute) => mute.mutedUserId === entry.blockedId,
                                ),
                              }}
                              compact
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="tp-soft-card p-4">
                  <h3 className="tp-text-card-title tp-text-heading">
                    뮤트 목록 ({mutedUsers.length})
                  </h3>
                  {mutedUsers.length === 0 ? (
                    <p className="tp-text-subtle mt-3 text-xs">뮤트한 사용자가 없습니다.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {mutedUsers.map((entry) => (
                        <div
                          key={entry.id}
                          className="tp-border-soft tp-text-accent rounded-lg border bg-white px-3 py-2 text-xs"
                        >
                          <p className="tp-text-heading break-all font-semibold">
                            {entry.mutedUser?.nickname ?? entry.mutedUser?.email ?? entry.mutedUserId}
                          </p>
                          <p className="tp-text-subtle mt-0.5 text-[11px]">
                            {entry.createdAt.toLocaleString("ko-KR")}
                          </p>
                          <div className="mt-2">
                            <UserRelationControls
                              key={`${entry.mutedUserId}:${blockedUsers.some((block) => block.blockedId === entry.mutedUserId) ? "1" : "0"}:1:0`}
                              targetUserId={entry.mutedUserId}
                              initialState={{
                                isBlockedByMe: blockedUsers.some(
                                  (block) => block.blockedId === entry.mutedUserId,
                                ),
                                hasBlockedMe: false,
                                isMutedByMe: true,
                              }}
                              compact
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
