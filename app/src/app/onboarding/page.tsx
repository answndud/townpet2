import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { auth } from "@/lib/auth";
import { listNeighborhoods } from "@/server/queries/neighborhood.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export default async function OnboardingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user?.email) {
    redirect("/login");
  }

  const [user, neighborhoods] = await Promise.all([
    getUserWithNeighborhoods(userId),
    listNeighborhoods(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const primaryNeighborhood = user.neighborhoods.find(
    (item) => item.isPrimary,
  );

  if (user.nickname && primaryNeighborhood) {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Onboarding
          </p>
          <h1 className="text-3xl font-semibold">환영합니다!</h1>
          <p className="text-sm text-[#6f6046]">
            닉네임과 대표 동네를 설정하고 Local 피드를 시작하세요.
          </p>
        </header>

        <OnboardingForm
          email={user.email}
          nickname={user.nickname}
          primaryNeighborhoodId={primaryNeighborhood?.neighborhood.id ?? null}
          neighborhoods={neighborhoods}
        />
      </main>
    </div>
  );
}
