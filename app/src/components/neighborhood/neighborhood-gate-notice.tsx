import Link from "next/link";

type NeighborhoodGateNoticeProps = {
  title?: string;
  description?: string;
  secondaryLink?: string;
  secondaryLabel?: string;
};

export function NeighborhoodGateNotice({
  title = "동네 설정이 필요합니다.",
  description = "동네를 설정해야 로컬 피드와 작성 기능을 사용할 수 있습니다.",
  secondaryLink,
  secondaryLabel,
}: NeighborhoodGateNoticeProps) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
        <span className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
          접근 안내
        </span>
        <h1 className="text-2xl font-semibold text-[#10284a]">{title}</h1>
        <p className="text-sm text-[#4f678d]">{description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/onboarding"
            className="border border-[#3567b5] bg-[#3567b5] px-4 py-2 font-semibold text-white transition hover:bg-[#2f5da4]"
          >
            온보딩으로 이동
          </Link>
          {secondaryLink && secondaryLabel ? (
            <Link
              href={secondaryLink}
              className="border border-[#bfd0ec] bg-white px-4 py-2 text-[#315484] transition hover:bg-[#f3f7ff]"
            >
              {secondaryLabel}
            </Link>
          ) : null}
          <Link
            href="/"
            className="border border-[#bfd0ec] bg-white px-4 py-2 text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
