import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            TownPet Access
          </p>
          <h1 className="text-3xl font-semibold">로그인</h1>
          <p className="text-sm text-[#6f6046]">
            이메일 인증을 완료한 후 로그인해 주세요.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <LoginForm />
        </section>

        <div className="flex items-center justify-between text-xs text-[#9a8462]">
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
