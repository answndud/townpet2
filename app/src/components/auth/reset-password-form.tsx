"use client";

import { useState, useTransition } from "react";

type ResetPasswordFormProps = {
  initialToken?: string | null;
};

export function ResetPasswordForm({ initialToken }: ResetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
      <form onSubmit={handleRequest} className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">재설정 토큰 발급</h2>
        <p className="text-xs text-[#6f6046]">
          이메일로 토큰을 발급합니다. 개발 환경에서는 토큰을 화면에 표시합니다.
        </p>
        <label className="flex flex-col gap-2 text-sm font-medium">
          이메일
          <input
            type="email"
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@townpet.dev"
            required
          />
        </label>
        {issuedToken ? (
          <div className="rounded-xl border border-[#e3d6c4] bg-[#fdf9f2] p-3 text-xs text-[#6f6046]">
            발급된 토큰: <span className="font-mono">{issuedToken}</span>
          </div>
        ) : null}
        <button
          type="submit"
          className="rounded-full border border-[#e3d6c4] bg-white px-4 py-2 text-xs font-semibold"
          disabled={isPending}
        >
          {isPending ? "발급 중..." : "토큰 발급"}
        </button>
      </form>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">비밀번호 재설정</h2>
        <label className="flex flex-col gap-2 text-sm font-medium">
          토큰
          <input
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="토큰을 입력하세요"
            required
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
          <p className="text-xs text-emerald-600">비밀번호가 재설정되었습니다.</p>
        ) : null}
        <button
          type="submit"
          className="rounded-full bg-[#2a241c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
          disabled={isPending}
        >
          {isPending ? "재설정 중..." : "비밀번호 재설정"}
        </button>
      </form>
    </div>
  );
}
