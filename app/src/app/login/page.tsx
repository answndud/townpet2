import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            계정 접속
          </p>
          <h1 className="text-3xl font-semibold text-[#10284a]">로그인</h1>
          <p className="text-sm text-[#4f678d]">
            이메일 인증을 완료한 후 로그인해 주세요.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <LoginForm />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a7398]">
          <Link href="/register">처음이신가요? 회원가입</Link>
          <div className="flex items-center gap-4">
            <Link href="/verify-email">이메일 인증</Link>
            <Link href="/password/reset">비밀번호 재설정</Link>
            <Link href="/">홈으로 돌아가기</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
