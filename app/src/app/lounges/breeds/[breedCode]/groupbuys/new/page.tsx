import Link from "next/link";

import { BreedGroupBuyForm } from "@/components/lounges/breed-groupbuy-form";
import { auth } from "@/lib/auth";
import { breedCodeParamSchema } from "@/lib/validations/lounge";

type BreedGroupBuyPageProps = {
  params: Promise<{ breedCode?: string }>;
};

export default async function BreedGroupBuyNewPage({ params }: BreedGroupBuyPageProps) {
  const resolvedParams = await params;
  const parsedBreedCode = breedCodeParamSchema.safeParse(resolvedParams.breedCode);
  const breedCode = parsedBreedCode.success ? parsedBreedCode.data : "UNKNOWN";
  const session = await auth();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href={`/lounges/breeds/${breedCode}`}
        className="inline-flex items-center border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484]"
      >
        라운지로 돌아가기
      </Link>
      <section className="mt-3 border border-[#c8d7ef] bg-white p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#4b6b9b]">Breed Lounge</p>
        <h1 className="mt-1 text-2xl font-bold text-[#10284a]">{breedCode} 공동구매 템플릿 작성</h1>
        <p className="mt-2 text-sm text-[#4c6890]">
          템플릿 구조로 작성되며 신규유저 제한/연락처 제한/신고 자동숨김 정책이 동일하게 적용됩니다.
        </p>
      </section>
      <section className="mt-3 border border-[#c8d7ef] bg-white p-4 sm:p-5">
        <BreedGroupBuyForm breedCode={breedCode} isAuthenticated={Boolean(session?.user?.id)} />
      </section>
    </main>
  );
}
