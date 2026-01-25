import Link from "next/link";

type NeighborhoodGateNoticeProps = {
  title?: string;
  description?: string;
};

export function NeighborhoodGateNotice({
  title = "동네 설정이 필요합니다.",
  description = "동네를 설정해야 로컬 피드와 작성 기능을 사용할 수 있습니다.",
}: NeighborhoodGateNoticeProps) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
        <span className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
          Neighborhood Gate
        </span>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-[#6f6046]">{description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/onboarding"
            className="rounded-full bg-[#f0b66b] px-4 py-2 font-semibold text-[#2a241c]"
          >
            온보딩으로 이동
          </Link>
          <Link href="/" className="rounded-full border border-[#e3d6c4] px-4 py-2">
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
