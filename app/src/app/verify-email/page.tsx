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
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Verification
          </p>
          <h1 className="text-3xl font-semibold">이메일 인증</h1>
          <p className="text-sm text-[#6f6046]">
            인증을 완료해야 로그인할 수 있습니다.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <VerifyEmailForm initialToken={initialToken} initialEmail={initialEmail} />
        </section>

        <div className="flex items-center justify-between text-xs text-[#9a8462]">
          <Link href="/login">로그인으로 돌아가기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
