"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";

type KakaoSignInButtonProps = {
  label?: string;
  callbackUrl?: string;
  devMode?: boolean;
  socialDevEnabled?: boolean;
};

export function KakaoSignInButton({
  label = "카카오로 시작",
  callbackUrl = "/onboarding",
  devMode = false,
  socialDevEnabled = false,
}: KakaoSignInButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (devMode && socialDevEnabled) {
      startTransition(async () => {
        await signIn("social-dev", {
          socialProvider: "kakao",
          callbackUrl,
        });
      });
      return;
    }

    if (devMode) {
      const query = new URLSearchParams({ callbackUrl });
      window.location.assign(`/api/auth/signin/kakao?${query.toString()}`);
      return;
    }

    startTransition(async () => {
      await signIn("kakao", { callbackUrl });
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-[#d2b200] bg-[#fee500] px-5 py-2 text-sm font-semibold text-[#3c1e1e] transition hover:bg-[#f5dd00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="text-xs font-bold">K</span>
      {isPending ? "카카오 로그인 중..." : label}
    </button>
  );
}
