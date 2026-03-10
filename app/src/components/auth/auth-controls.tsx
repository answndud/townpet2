"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { emitViewerShellSync } from "@/lib/viewer-shell-sync";

type AuthControlsProps = {
  label: string;
};

export function AuthControls({ label }: AuthControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      data-testid="auth-logout-button"
      className="inline-flex h-8 items-center rounded-sm px-1 text-[14px] leading-none text-[#173963] transition hover:bg-[#dcecff] hover:text-[#0f2f56] disabled:opacity-60"
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
          }).catch(() => null);
          await signOut({ redirect: false });
          emitViewerShellSync({ reason: "auth-logout" });
          router.replace("/login");
          router.refresh();
        })
      }
      disabled={isPending}
    >
      {isPending ? "로그아웃 중..." : label}
    </button>
  );
}
