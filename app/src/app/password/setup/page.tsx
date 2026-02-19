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
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            보안
          </p>
          <h1 className="text-3xl font-semibold text-[#10284a]">비밀번호 설정</h1>
          <p className="text-sm text-[#4f678d]">
            기존 계정의 비밀번호를 새로 지정하거나 변경할 수 있습니다.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <SetPasswordForm />
        </section>

        <div className="flex items-center justify-between text-xs text-[#5a7398]">
          <Link href="/profile">프로필로 돌아가기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
