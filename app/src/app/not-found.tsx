import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#edf3fb] px-4 py-16">
      <main className="mx-auto w-full max-w-[720px] border border-[#c8d7ef] bg-white p-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#5b78a1]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-[#10284a]">
          페이지를 찾을 수 없습니다.
        </h1>
        <p className="mt-3 text-sm text-[#5a7398]">
          주소를 확인하거나 피드로 이동해 주세요.
        </p>
        <Link
          href="/feed"
          className="mt-5 inline-flex border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
        >
          피드로 이동
        </Link>
      </main>
    </div>
  );
}
