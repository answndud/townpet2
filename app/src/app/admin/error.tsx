"use client";

import { useEffect } from "react";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border border-[#c8d7ef] bg-white p-6 text-center">
      <h2 className="text-lg font-semibold text-[#153a6a]">
        관리자 화면을 불러오지 못했습니다.
      </h2>
      <p className="mt-2 text-sm text-[#5a7398]">잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
      >
        다시 시도
      </button>
    </div>
  );
}
