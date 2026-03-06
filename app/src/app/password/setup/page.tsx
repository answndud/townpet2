import Link from "next/link";
import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { auth } from "@/lib/auth";
import { getPasswordSetupCopy } from "@/lib/password-setup";
import { getUserPasswordStatusById } from "@/server/queries/user.queries";

export default async function PasswordSetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const passwordStatus = await getUserPasswordStatusById(session.user.id);
  if (!passwordStatus) {
    redirect("/login");
  }

  const copy = getPasswordSetupCopy(passwordStatus.hasPassword);

  return (
    <div className="tp-page-bg min-h-screen">
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            보안
          </p>
          <h1 className="text-3xl font-semibold text-[#10284a]">{copy.pageTitle}</h1>
          <p className="text-sm text-[#4f678d]">
            {copy.pageDescription}
          </p>
        </header>

        <section className="tp-card p-5 sm:p-6">
          <SetPasswordForm hasPassword={passwordStatus.hasPassword} />
        </section>

        <div className="flex items-center justify-between text-xs text-[#5a7398]">
          <Link href="/profile">프로필로 돌아가기</Link>
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </main>
    </div>
  );
}
