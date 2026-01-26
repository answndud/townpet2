import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            TownPet Access
          </p>
          <h1 className="text-3xl font-semibold">회원가입</h1>
          <p className="text-sm text-[#6f6046]">
            이메일과 비밀번호로 TownPet을 시작해 보세요.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <RegisterForm />
        </section>

        <div className="flex items-center justify-between text-xs text-[#9a8462]">
          <Link href="/login">이미 계정이 있으신가요? 로그인</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
