"use client";

import { useState, useTransition } from "react";

export function SetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/password/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "비밀번호 설정에 실패했습니다.");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        현재 비밀번호 (있는 경우)
        <input
          type="password"
          className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="기존 비밀번호"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        새 비밀번호
        <input
          type="password"
          className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="최소 8자"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        새 비밀번호 확인
        <input
          type="password"
          className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          placeholder="다시 입력"
          required
        />
      </label>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {success ? (
        <p className="text-xs text-emerald-600">비밀번호가 업데이트되었습니다.</p>
      ) : null}
      <button
        type="submit"
        className="rounded-full bg-[#2a241c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
        disabled={isPending}
      >
        {isPending ? "저장 중..." : "비밀번호 저장"}
      </button>
    </form>
  );
}
