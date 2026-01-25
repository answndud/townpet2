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
            이메일로 시작하고 동네 설정을 완료해 주세요.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <LoginForm />
        </section>

        <Link href="/" className="text-xs text-[#9a8462]">
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
}
