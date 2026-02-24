"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const GUEST_FP_STORAGE_KEY = "townpet:guest-fingerprint:v1";

function getGuestFingerprint() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(GUEST_FP_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(GUEST_FP_STORAGE_KEY, created);
  return created;
}

type GuestPostDetailActionsProps = {
  postId: string;
};

export function GuestPostDetailActions({ postId }: GuestPostDetailActionsProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!password.trim()) {
      setError("글 비밀번호를 입력해 주세요.");
      return;
    }

    if (!window.confirm("비회원 글을 삭제할까요?")) {
      return;
    }

    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-guest-fingerprint": getGuestFingerprint(),
          "x-guest-mode": "1",
        },
        body: JSON.stringify({ guestPassword: password.trim() }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error?.message ?? "삭제에 실패했습니다.");
        return;
      }

      router.push("/feed");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="글 비밀번호"
        className="h-8 border border-[#bfd0ec] bg-white px-2.5 text-xs text-[#1f3f71]"
      />
      <Link
        href={`/posts/${postId}/edit?guest=1&pw=${encodeURIComponent(password.trim())}`}
        className="inline-flex h-8 items-center border border-[#bfd0ec] bg-white px-3 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
      >
        비회원 수정
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        className="inline-flex h-8 items-center border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-[#d5dfee] disabled:text-[#9fb2cf]"
        disabled={isPending}
      >
        {isPending ? "삭제 중..." : "비회원 삭제"}
      </button>
      {error ? <p className="w-full text-right text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
