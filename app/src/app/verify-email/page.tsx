import Link from "next/link";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";

type VerifyEmailPageProps = {
  searchParams?: { token?: string; email?: string };
};

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const initialToken = searchParams?.token ?? null;
  const initialEmail = searchParams?.email ?? null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            이메일 인증
          </p>
          <h1 className="text-3xl font-semibold text-[#10284a]">이메일 인증</h1>
          <p className="text-sm text-[#4f678d]">
            인증을 완료해야 로그인할 수 있습니다.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <VerifyEmailForm initialToken={initialToken} initialEmail={initialEmail} />
        </section>

        <div className="flex items-center justify-between text-xs text-[#5a7398]">
          <Link href="/login">로그인으로 돌아가기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
