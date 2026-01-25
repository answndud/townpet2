"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";

type AuthControlsProps = {
  label: string;
};

export function AuthControls({ label }: AuthControlsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="rounded-full border border-[#e3d6c4] bg-white px-3 py-1 text-xs"
      onClick={() =>
        startTransition(async () => {
          await signOut({ callbackUrl: "/login" });
        })
      }
      disabled={isPending}
    >
      {isPending ? "로그아웃 중..." : label}
    </button>
  );
}
