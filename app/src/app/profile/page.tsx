import Link from "next/link";
import { redirect } from "next/navigation";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { auth } from "@/lib/auth";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { listUserPosts } from "@/server/queries/post.queries";

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
  if (!primaryNeighborhood) {
    return (
      <NeighborhoodGateNotice
        title="프로필을 보려면 동네 설정이 필요합니다."
        description="대표 동네를 설정하면 프로필 요약을 확인할 수 있습니다."
      />
    );
  }

  const [allPosts, localPosts, globalPosts] = await Promise.all([
    listUserPosts({ authorId: user.id }),
    listUserPosts({ authorId: user.id, scope: "LOCAL" }),
    listUserPosts({ authorId: user.id, scope: "GLOBAL" }),
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
            <div>이메일: {user.email}</div>
            <div>온보딩 상태: 완료</div>
            <div>
              대표 동네: {primaryNeighborhood.neighborhood.city} {" "}
              {primaryNeighborhood.neighborhood.name}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
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
      </main>
    </div>
  );
}
