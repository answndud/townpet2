import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { NeighborhoodPreferenceForm } from "@/components/profile/neighborhood-preference-form";
import { PetProfileManager } from "@/components/profile/pet-profile-manager";
import { ProfileImageUploader } from "@/components/profile/profile-image-uploader";
import { ProfileInfoForm } from "@/components/profile/profile-info-form";
import { UserRelationControls } from "@/components/user/user-relation-controls";
import { auth } from "@/lib/auth";
import { getUserWithNeighborhoods, listPetsByUserId } from "@/server/queries/user.queries";
import { listUserPosts } from "@/server/queries/post.queries";
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

  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);

  const [allPosts, localPosts, globalPosts, blockedUsers, mutedUsers, pets] = await Promise.all([
    listUserPosts({ authorId: user.id }),
    listUserPosts({ authorId: user.id, scope: "LOCAL" }),
    listUserPosts({ authorId: user.id, scope: "GLOBAL" }),
    listMyBlockedUsers(user.id),
    listMyMutedUsers(user.id),
    listPetsByUserId(user.id),
  ]);

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
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
                className="h-14 w-14 rounded-full border border-[#bfd0ec] object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#bfd0ec] bg-white text-xs font-semibold text-[#5b78a1]">
                NO IMG
              </div>
            )}
            <p className="text-xs text-[#5a7398]">프로필 사진은 내 프로필 섹션에서 수정할 수 있습니다.</p>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="border border-[#c8d7ef] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">전체</p>
            <p className="mt-2 text-3xl font-bold text-[#10284a]">{allPosts.length}</p>
            <p className="text-xs text-[#4f678d]">총 작성글</p>
          </div>
          <div className="border border-[#c8d7ef] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">동네</p>
            <p className="mt-2 text-3xl font-bold text-[#10284a]">{localPosts.length}</p>
            <p className="text-xs text-[#4f678d]">동네 범위 글</p>
          </div>
          <div className="border border-[#c8d7ef] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">온동네</p>
            <p className="mt-2 text-3xl font-bold text-[#10284a]">{globalPosts.length}</p>
            <p className="text-xs text-[#4f678d]">온동네 범위 글</p>
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">계정 정보</h2>
          <div className="mt-4 grid gap-2 text-sm text-[#355988]">
            <div>닉네임: {user.nickname ?? "미설정"}</div>
            <div>소개: {user.bio?.trim() ? user.bio : "미설정"}</div>
            <div>이메일: {user.email}</div>
            <div>온보딩 상태: 완료</div>
            <div>
              대표 동네: {primaryNeighborhood
                ? `${primaryNeighborhood.neighborhood.city} ${primaryNeighborhood.neighborhood.name}`
                : "미설정"}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href={`/users/${user.id}`}
              className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-[#315484] transition hover:bg-[#f3f7ff]"
            >
              공개 프로필 보기
            </Link>
            <Link
              href="/my-posts"
              className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-[#315484] transition hover:bg-[#f3f7ff]"
            >
              내 작성글 보기
            </Link>
            <Link
              href="/password/setup"
              className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-[#315484] transition hover:bg-[#f3f7ff]"
            >
              비밀번호 설정
            </Link>
            <Link
              href="/my-posts?scope=LOCAL"
              className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-[#315484] transition hover:bg-[#f3f7ff]"
            >
              동네 글
            </Link>
            <Link
              href="/my-posts?scope=GLOBAL"
              className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-[#315484] transition hover:bg-[#f3f7ff]"
            >
              온동네 글
            </Link>
          </div>
        </section>

        <ProfileInfoForm initialNickname={user.nickname} initialBio={user.bio} />
        <NeighborhoodPreferenceForm
          selectedNeighborhoods={user.neighborhoods.map((item) => item.neighborhood)}
          primaryNeighborhoodId={primaryNeighborhood?.neighborhood.id ?? null}
        />
        <ProfileImageUploader initialImageUrl={user.image} />
        <PetProfileManager pets={pets} />

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">사용자 관계 관리</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            차단/뮤트한 사용자를 여기서 바로 해제할 수 있습니다.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="border border-[#dbe5f3] bg-[#f8fbff] p-4">
              <h3 className="text-sm font-semibold text-[#1f3f71]">
                차단 목록 ({blockedUsers.length})
              </h3>
              {blockedUsers.length === 0 ? (
                <p className="mt-3 text-xs text-[#5a7398]">차단한 사용자가 없습니다.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {blockedUsers.map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-[#c9d8ef] bg-white px-3 py-2 text-xs text-[#355988]"
                    >
                      <p className="font-semibold text-[#1f3f71]">
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

            <div className="border border-[#dbe5f3] bg-[#f8fbff] p-4">
              <h3 className="text-sm font-semibold text-[#1f3f71]">
                뮤트 목록 ({mutedUsers.length})
              </h3>
              {mutedUsers.length === 0 ? (
                <p className="mt-3 text-xs text-[#5a7398]">뮤트한 사용자가 없습니다.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {mutedUsers.map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-[#c9d8ef] bg-white px-3 py-2 text-xs text-[#355988]"
                    >
                      <p className="font-semibold text-[#1f3f71]">
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
      </main>
    </div>
  );
}
