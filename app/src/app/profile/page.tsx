import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { getPasswordSetupCopy } from "@/lib/password-setup";
import { NeighborhoodPreferenceForm } from "@/components/profile/neighborhood-preference-form";
import { PetProfileManager } from "@/components/profile/pet-profile-manager";
import { ProfileImageUploader } from "@/components/profile/profile-image-uploader";
import { ProfileInfoForm } from "@/components/profile/profile-info-form";
import { UserRelationControls } from "@/components/user/user-relation-controls";
import { auth } from "@/lib/auth";
import {
  getPetLifeStageLabel,
  getPetSizeClassLabel,
  hasBreedLoungeRoute,
} from "@/lib/pet-profile";
import { listAudienceSegmentsByUserId } from "@/server/queries/audience-segment.queries";
import {
  getUserPasswordStatusById,
  getUserWithNeighborhoods,
  listPetsByUserId,
} from "@/server/queries/user.queries";
import { countUserPosts } from "@/server/queries/post.queries";
import { listMyBlockedUsers, listMyMutedUsers } from "@/server/queries/user-relation.queries";

export default async function ProfilePage() {
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
  const passwordSetupCopy = getPasswordSetupCopy(passwordStatus?.hasPassword ?? true);

  const isNicknameMissing = !user.nickname?.trim();
  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);

  const postCount = await countUserPosts({ authorId: user.id });
  let blockedUsers = [] as Awaited<ReturnType<typeof listMyBlockedUsers>>;
  let mutedUsers = [] as Awaited<ReturnType<typeof listMyMutedUsers>>;
  let pets = [] as Awaited<ReturnType<typeof listPetsByUserId>>;
  let audienceSegments = [] as Awaited<ReturnType<typeof listAudienceSegmentsByUserId>>;

  if (!isNicknameMissing) {
    [blockedUsers, mutedUsers, pets, audienceSegments] = await Promise.all([
      listMyBlockedUsers(user.id),
      listMyMutedUsers(user.id),
      listPetsByUserId(user.id),
      listAudienceSegmentsByUserId(user.id),
    ]);
  }

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">내 프로필</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            계정 활동 요약
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            작성 내역과 동네 설정 상태를 한눈에 확인할 수 있습니다.
          </p>

          <div className="mt-4 flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt="프로필 이미지"
                width={56}
                height={56}
                className="h-14 w-14 rounded-full border border-[#cbdcf5] object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#cbdcf5] bg-white text-xs font-semibold text-[#5b78a1]">
                NO IMG
              </div>
            )}
            <p className="text-xs text-[#5a7398]">프로필 사진은 내 프로필 섹션에서 수정할 수 있습니다.</p>
          </div>
        </header>

        {isNicknameMissing ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <h2 className="text-base font-semibold">닉네임 설정이 필요합니다.</h2>
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

        <section className="grid gap-3 md:grid-cols-1">
          <div className="tp-card p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">전체</p>
            <p className="mt-2 text-3xl font-bold text-[#10284a]">{postCount}</p>
            <p className="text-xs text-[#4f678d]">총 작성글</p>
          </div>
        </section>

        <section className="tp-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">계정 정보</h2>
          <div className="mt-4 grid gap-2 text-sm text-[#355988]">
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
            <Link
              href="/my-posts"
              className="tp-btn-soft px-3 py-1.5 text-[#315484]"
            >
              내 작성글 보기
            </Link>
            <Link
              href="/password/setup"
              className="tp-btn-soft px-3 py-1.5 text-[#315484]"
            >
              {passwordSetupCopy.profileLinkLabel}
            </Link>
          </div>
        </section>

        <ProfileInfoForm
          initialNickname={user.nickname}
          initialBio={user.bio}
        />
        {!isNicknameMissing ? (
          <>
            <NeighborhoodPreferenceForm
              selectedNeighborhoods={user.neighborhoods.map((item) => item.neighborhood)}
              primaryNeighborhoodId={primaryNeighborhood?.neighborhood.id ?? null}
            />
            <ProfileImageUploader initialImageUrl={user.image} />
            <PetProfileManager pets={pets} />
            <section className="tp-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[#153a6a]">개인화 세그먼트</h2>
              <p className="mt-2 text-xs text-[#5a7398]">
                반려동물 프로필에서 계산한 맞춤 피드/품종 라운지 기준입니다.
              </p>
              {audienceSegments.length === 0 ? (
                <p className="mt-4 text-sm text-[#5a7398]">
                  반려동물 프로필에 품종 코드, 체급, 생애단계를 입력하면 맞춤 세그먼트가 생성됩니다.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {audienceSegments.map((segment) => (
                    <article
                      key={segment.id}
                      className="rounded-lg border border-[#dbe5f3] bg-[#f8fbff] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1f3f71]">{segment.label}</p>
                        <span className="rounded-full border border-[#c8daf5] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#315b9a]">
                          신뢰도 {Math.round(segment.confidenceScore * 100)}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5a7398]">
                        {[
                          segment.breedCode ? `품종 코드 ${segment.breedCode}` : null,
                          getPetSizeClassLabel(segment.sizeClass),
                          getPetLifeStageLabel(segment.lifeStage),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "반려동물 프로필 기반 직접 신호"}
                      </p>
                      {hasBreedLoungeRoute(segment.breedCode) ? (
                        <Link
                          href={`/lounges/breeds/${segment.breedCode}`}
                          className="tp-btn-soft mt-3 inline-flex px-3 py-1.5 text-xs font-semibold text-[#204f8a]"
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
              <h2 className="text-lg font-semibold text-[#153a6a]">사용자 관계 관리</h2>
              <p className="mt-2 text-xs text-[#5a7398]">
                차단/뮤트한 사용자를 여기서 바로 해제할 수 있습니다.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="tp-soft-card p-4">
                  <h3 className="text-sm font-semibold text-[#1f3f71]">
                    차단 목록 ({blockedUsers.length})
                  </h3>
                  {blockedUsers.length === 0 ? (
                    <p className="mt-3 text-xs text-[#5a7398]">차단한 사용자가 없습니다.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {blockedUsers.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-[#c9d8ef] bg-white px-3 py-2 text-xs text-[#355988]">
                          <p className="break-all font-semibold text-[#1f3f71]">
                            {entry.blocked?.nickname ?? entry.blocked?.email ?? entry.blockedId}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#5a7398]">
                            {entry.createdAt.toLocaleString("ko-KR")}
                          </p>
                          <div className="mt-2">
                            <UserRelationControls
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
                  <h3 className="text-sm font-semibold text-[#1f3f71]">
                    뮤트 목록 ({mutedUsers.length})
                  </h3>
                  {mutedUsers.length === 0 ? (
                    <p className="mt-3 text-xs text-[#5a7398]">뮤트한 사용자가 없습니다.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {mutedUsers.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-[#c9d8ef] bg-white px-3 py-2 text-xs text-[#355988]">
                          <p className="break-all font-semibold text-[#1f3f71]">
                            {entry.mutedUser?.nickname ?? entry.mutedUser?.email ?? entry.mutedUserId}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#5a7398]">
                            {entry.createdAt.toLocaleString("ko-KR")}
                          </p>
                          <div className="mt-2">
                            <UserRelationControls
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
