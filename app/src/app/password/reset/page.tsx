import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type PasswordResetPageProps = {
  searchParams?: { token?: string };
};

export default function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
  const initialToken = searchParams?.token ?? null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Security
          </p>
          <h1 className="text-3xl font-semibold">비밀번호 재설정</h1>
          <p className="text-sm text-[#6f6046]">
            등록된 이메일로 재설정 토큰을 발급한 뒤 비밀번호를 바꿉니다.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <ResetPasswordForm initialToken={initialToken} />
        </section>

        <div className="flex items-center justify-between text-xs text-[#9a8462]">
          <Link href="/login">로그인으로 돌아가기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
