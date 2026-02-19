"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type ResetPasswordFormProps = {
  initialToken?: string | null;
};

export function ResetPasswordForm({ initialToken }: ResetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const handleRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIssuedToken(null);
    setRequestSuccess(false);

    startTransition(async () => {
      const response = await fetch("/api/auth/password/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "요청에 실패했습니다.");
        return;
      }

      const data = await response.json().catch(() => null);
      const newToken = data?.data?.token ?? null;
      setIssuedToken(newToken);
      if (newToken && !initialToken) {
        setToken(newToken);
      }
      setRequestSuccess(true);
    });
  };

  const handleReset = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "재설정에 실패했습니다.");
        return;
      }

      setSuccess(true);
      setPassword("");
      setPasswordConfirm("");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {initialToken ? (
        <div className="border border-[#bfd0ec] bg-[#f6f9ff] p-3 text-xs text-[#4f678d]">
          메일에서 받은 토큰을 확인했습니다. 아래에서 새 비밀번호를 설정해 주세요.
        </div>
      ) : null}
      <form onSubmit={handleRequest} className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[#153a6a]">재설정 토큰 발급</h2>
        <p className="text-xs text-[#4f678d]">
          이메일로 토큰을 발급합니다. 개발 환경에서는 토큰을 화면에 표시합니다.
        </p>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          이메일
          <input
            type="email"
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@townpet.dev"
            required
          />
        </label>
        {issuedToken ? (
          <div className="border border-[#bfd0ec] bg-[#f6f9ff] p-3 text-xs text-[#4f678d]">
            발급된 토큰: <span className="font-mono">{issuedToken}</span>
          </div>
        ) : null}
        {requestSuccess ? (
          <p className="text-xs text-emerald-600">이메일을 확인해 주세요.</p>
        ) : null}
        <button
          type="submit"
          className="border border-[#bfd0ec] bg-white px-4 py-2 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          disabled={isPending}
        >
          {isPending ? "발급 중..." : "토큰 발급"}
        </button>
      </form>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[#153a6a]">비밀번호 재설정</h2>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          토큰
          <input
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="토큰을 입력하세요"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          새 비밀번호
          <input
            type="password"
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
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
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="다시 입력"
            required
          />
        </label>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {success ? (
          <div className="flex items-center justify-between text-xs text-emerald-600">
            <span>비밀번호가 재설정되었습니다.</span>
            <Link href="/login" className="text-xs text-[#5a7398]">
              로그인으로 이동
            </Link>
          </div>
        ) : null}
        <button
          type="submit"
          className="border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending}
        >
          {isPending ? "재설정 중..." : "비밀번호 재설정"}
        </button>
      </form>
    </div>
  );
}
