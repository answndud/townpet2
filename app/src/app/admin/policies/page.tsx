import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { GuestReadPolicyForm } from "@/components/admin/guest-read-policy-form";
import { postTypeMeta } from "@/lib/post-presenter";
import { getCurrentUser } from "@/server/auth";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";

export default async function AdminPoliciesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isModerator =
    user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

  if (!isModerator) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
          <h1 className="text-xl font-semibold text-[#10284a]">접근 권한이 없습니다.</h1>
          <p className="text-sm text-[#4f678d]">
            정책 설정은 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/feed" className="text-xs text-[#5a7398]">
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            열람 권한 정책
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            비회원이 로그인 없이 볼 수 없는 카테고리를 조정합니다.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">현재 로그인 필수 카테고리</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {loginRequiredTypes.length > 0 ? (
              loginRequiredTypes.map((type) => (
                <span
                  key={type}
                  className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]"
                >
                  {postTypeMeta[type].label} ({type})
                </span>
              ))
            ) : (
              <span className="text-[#5a7398]">현재 비회원 제한 카테고리가 없습니다.</span>
            )}
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">정책 편집</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            체크된 카테고리는 비회원이 열람할 수 없으며 로그인 후 접근 가능합니다.
          </p>
          <div className="mt-4">
            <GuestReadPolicyForm
              initialLoginRequiredTypes={loginRequiredTypes}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/auth-audits">인증 로그</Link>
          <Link href="/feed">피드로 이동</Link>
        </div>
      </main>
    </div>
  );
}
