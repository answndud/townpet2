import Link from "next/link";

import { getUserByEmail } from "@/server/queries/user.queries";
import { listUserPosts } from "@/server/queries/post.queries";

export default async function ProfilePage() {
  const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
  const user = await getUserByEmail(email);

  if (!user) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
          <p className="text-sm text-[#6f6046]">사용자를 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  const [allPosts, localPosts, globalPosts] = await Promise.all([
    listUserPosts({ authorId: user.id }),
    listUserPosts({ authorId: user.id, scope: "LOCAL" }),
    listUserPosts({ authorId: user.id, scope: "GLOBAL" }),
  ]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Profile
          </p>
          <h1 className="text-2xl font-semibold">내 프로필</h1>
          <p className="text-sm text-[#6f6046]">
            작성 활동과 범위를 요약합니다.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3d6c4] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {allPosts.length}
            </p>
            <p className="text-xs text-[#6f6046]">전체 작성글</p>
          </div>
          <div className="rounded-2xl border border-[#e3d6c4] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
              Local
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {localPosts.length}
            </p>
            <p className="text-xs text-[#6f6046]">동네 글</p>
          </div>
          <div className="rounded-2xl border border-[#e3d6c4] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
              Global
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {globalPosts.length}
            </p>
            <p className="text-xs text-[#6f6046]">온동네 글</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">계정 정보</h2>
          <div className="mt-4 grid gap-2 text-sm text-[#6f6046]">
            <div>닉네임: {user.nickname ?? "미설정"}</div>
            <div>이메일: {user.email}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6f6046]">
            <Link
              href="/my-posts"
              className="rounded-full border border-[#e3d6c4] bg-white px-3 py-1"
            >
              내 작성글 보기
            </Link>
            <Link
              href="/my-posts?scope=LOCAL"
              className="rounded-full border border-[#e3d6c4] bg-white px-3 py-1"
            >
              동네 글
            </Link>
            <Link
              href="/my-posts?scope=GLOBAL"
              className="rounded-full border border-[#e3d6c4] bg-white px-3 py-1"
            >
              온동네 글
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
