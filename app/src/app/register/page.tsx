import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            계정 가입
          </p>
          <h1 className="text-3xl font-semibold text-[#10284a]">회원가입</h1>
          <p className="text-sm text-[#4f678d]">
            이메일과 비밀번호로 TownPet을 시작해 보세요.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <RegisterForm />
        </section>

        <div className="flex items-center justify-between text-xs text-[#5a7398]">
          <Link href="/login">이미 계정이 있으신가요? 로그인</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
