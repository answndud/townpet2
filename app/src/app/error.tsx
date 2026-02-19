"use client";

import { useEffect } from "react";
import Link from "next/link";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#edf3fb] px-4 py-16">
      <main className="mx-auto w-full max-w-[720px] border border-[#c8d7ef] bg-white p-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#5b78a1]">오류 발생</p>
        <h1 className="mt-2 text-2xl font-bold text-[#10284a]">
          요청을 처리하는 중 문제가 발생했습니다.
        </h1>
        <p className="mt-3 text-sm text-[#5a7398]">
          잠시 후 다시 시도하거나 피드로 이동해 주세요.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
          >
            다시 시도
          </button>
          <Link
            href="/feed"
            className="border border-[#bfd0ec] bg-white px-4 py-2 text-sm font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          >
            피드로 이동
          </Link>
        </div>
      </main>
    </div>
  );
}
