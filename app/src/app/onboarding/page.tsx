import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { auth } from "@/lib/auth";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export default async function OnboardingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId || !session?.user?.email) {
    redirect("/login");
  }

  const user = await getUserWithNeighborhoods(userId);

  if (!user) {
    redirect("/login");
  }

  const primaryNeighborhood = user.neighborhoods.find(
    (item) => item.isPrimary,
  );

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            시작 설정
          </p>
          <h1 className="text-3xl font-semibold text-[#10284a]">환영합니다</h1>
          <p className="text-sm text-[#4f678d]">
            닉네임을 먼저 만들고, 내 동네는 원할 때 최대 3개까지 설정할 수 있어요.
          </p>
        </header>

        <OnboardingForm
          email={user.email}
          nickname={user.nickname}
          bio={user.bio}
          selectedNeighborhoods={user.neighborhoods.map((item) => item.neighborhood)}
          primaryNeighborhoodId={primaryNeighborhood?.neighborhood.id ?? null}
        />
      </main>
    </div>
  );
}
