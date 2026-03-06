"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { getPasswordSetupCopy, validatePasswordSetupForm } from "@/lib/password-setup";

type SetPasswordFormProps = {
  hasPassword: boolean;
};

export function SetPasswordForm({ hasPassword }: SetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const copy = getPasswordSetupCopy(hasPassword);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validatePasswordSetupForm({
      hasPassword,
      currentPassword,
      password,
      passwordConfirm,
    });
    if (validationError) {
      setError(validationError);
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
        setError(data?.error?.message ?? "비밀번호 수정에 실패했습니다.");
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
      {hasPassword ? (
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          {copy.currentPasswordLabel}
          <input
            type="password"
            className="tp-input-soft px-3 py-2 text-sm"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder={copy.currentPasswordPlaceholder}
            required
          />
        </label>
      ) : null}
      <p className="text-xs text-[#5a7398]">{copy.currentPasswordHint}</p>
      {hasPassword ? (
        <p className="text-xs text-[#5a7398]">
          현재 비밀번호를 잊었다면 <Link href="/password/reset" className="underline">이메일로 초기화</Link>를 사용해 주세요.
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        새 비밀번호
        <input
          type="password"
          className="tp-input-soft px-3 py-2 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="최소 8자"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        새 비밀번호 확인
        <input
          type="password"
          className="tp-input-soft px-3 py-2 text-sm"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          placeholder="다시 입력"
          required
        />
      </label>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {success ? (
        <div className="flex items-center justify-between text-xs text-emerald-600">
          <span>{copy.successMessage}</span>
          <Link href="/profile" className="text-xs text-[#5a7398]">
            프로필로 이동
          </Link>
        </div>
      ) : null}
      <button
        type="submit"
        className="tp-btn-primary px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
        disabled={isPending}
      >
        {isPending ? "저장 중..." : copy.submitLabel}
      </button>
    </form>
  );
}
