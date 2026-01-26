import Link from "next/link";
import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { auth } from "@/lib/auth";

export default async function PasswordSetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Security
          </p>
          <h1 className="text-3xl font-semibold">비밀번호 설정</h1>
          <p className="text-sm text-[#6f6046]">
            기존 계정의 비밀번호를 새로 지정하거나 변경할 수 있습니다.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <SetPasswordForm />
        </section>

        <div className="flex items-center justify-between text-xs text-[#9a8462]">
          <Link href="/profile">프로필로 돌아가기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
