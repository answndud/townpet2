"use client";

import Link from "next/link";

type ReactionLoginPromptProps = {
  isOpen: boolean;
  message: string;
  loginHref: string;
  align?: "start" | "center" | "end";
  onClose: () => void;
};

export function ReactionLoginPrompt({
  isOpen,
  message,
  loginHref,
  align = "center",
  onClose,
}: ReactionLoginPromptProps) {
  if (!isOpen) {
    return null;
  }

  const desktopAlignClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <>
      <div className={`absolute top-[calc(100%+8px)] z-10 hidden min-w-[220px] sm:block ${desktopAlignClass}`}>
        <div className="rounded-xl border border-[#dbe6f6] bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(16,40,74,0.14)]">
          <p className="text-[12px] leading-5 text-[#355988]">{message}</p>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="tp-btn-soft tp-btn-xs"
              onClick={onClose}
            >
              닫기
            </button>
            <Link href={loginHref} className="tp-btn-primary tp-btn-xs">
              로그인하기
            </Link>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-4 z-30 sm:hidden">
        <div className="rounded-2xl border border-[#dbe6f6] bg-white px-4 py-3 shadow-[0_16px_36px_rgba(16,40,74,0.18)]">
          <p className="text-[13px] leading-5 text-[#355988]">{message}</p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="tp-btn-soft tp-btn-sm"
              onClick={onClose}
            >
              닫기
            </button>
            <Link href={loginHref} className="tp-btn-primary tp-btn-sm">
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
