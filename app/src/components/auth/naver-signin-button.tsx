"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";

type NaverSignInButtonProps = {
  label?: string;
  callbackUrl?: string;
  devMode?: boolean;
  socialDevEnabled?: boolean;
};

export function NaverSignInButton({
  label = "네이버로 시작",
  callbackUrl = "/onboarding",
  devMode = false,
  socialDevEnabled = false,
}: NaverSignInButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (devMode && socialDevEnabled) {
      startTransition(async () => {
        await signIn("social-dev", {
          provider: "naver",
          callbackUrl,
        });
      });
      return;
    }

    if (devMode) {
      const query = new URLSearchParams({ callbackUrl });
      window.location.assign(`/api/auth/signin/naver?${query.toString()}`);
      return;
    }

    startTransition(async () => {
      await signIn("naver", { callbackUrl });
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex w-full items-center justify-center gap-2 border border-[#02a84b] bg-[#03c75a] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#02b350] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="text-xs font-bold">N</span>
      {isPending ? "네이버 로그인 중..." : label}
    </button>
  );
}
