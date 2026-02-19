import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type PasswordResetPageProps = {
  searchParams?: { token?: string };
};

export default function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
  const initialToken = searchParams?.token ?? null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            보안
          </p>
          <h1 className="text-3xl font-semibold text-[#10284a]">비밀번호 재설정</h1>
          <p className="text-sm text-[#4f678d]">
            등록된 이메일로 재설정 토큰을 발급한 뒤 비밀번호를 바꿉니다.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <ResetPasswordForm initialToken={initialToken} />
        </section>

        <div className="flex items-center justify-between text-xs text-[#5a7398]">
          <Link href="/login">로그인으로 돌아가기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
