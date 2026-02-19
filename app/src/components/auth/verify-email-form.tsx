"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type VerifyEmailFormProps = {
  initialToken?: string | null;
  initialEmail?: string | null;
};

export function VerifyEmailForm({
  initialToken,
  initialEmail,
}: VerifyEmailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [token, setToken] = useState(initialToken ?? "");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const autoVerifyAttemptedRef = useRef(false);

  useEffect(() => {
    if (!initialToken || success || autoVerifyAttemptedRef.current) {
      return;
    }

    autoVerifyAttemptedRef.current = true;
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: initialToken }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "인증에 실패했습니다.");
        return;
      }

      setSuccess(true);
    });
  }, [initialToken, startTransition, success]);

  const handleRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setRequestSuccess(false);
    setIssuedToken(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/verify/request", {
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
      if (newToken && !initialToken) {
        setToken(newToken);
        setIssuedToken(newToken);
      }
      setRequestSuccess(true);
    });
  };

  const handleConfirm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "인증에 실패했습니다.");
        return;
      }

      setSuccess(true);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleRequest} className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[#153a6a]">인증 메일 재발송</h2>
        <p className="text-xs text-[#4f678d]">
          이메일 인증은 필수입니다. 메일이 오지 않으면 다시 요청해 주세요.
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
        {requestSuccess ? (
          <p className="text-xs text-emerald-600">인증 메일을 다시 보냈습니다.</p>
        ) : null}
        {issuedToken ? (
          <div className="border border-[#bfd0ec] bg-[#f6f9ff] p-3 text-xs text-[#4f678d]">
            발급된 토큰: <span className="font-mono">{issuedToken}</span>
          </div>
        ) : null}
        <button
          type="submit"
          className="border border-[#bfd0ec] bg-white px-4 py-2 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
          disabled={isPending}
        >
          {isPending ? "발송 중..." : "인증 메일 보내기"}
        </button>
      </form>

      <form onSubmit={handleConfirm} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[#153a6a]">인증 토큰 입력</h2>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          토큰
          <input
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="메일로 받은 토큰을 입력"
            required
          />
        </label>
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {success ? (
          <p className="text-xs text-emerald-600">이메일 인증이 완료되었습니다.</p>
        ) : null}
        {isPending && initialToken && !success ? (
          <p className="text-xs text-[#5a7398]">인증 확인 중...</p>
        ) : null}
        <button
          type="submit"
          className="border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending}
        >
          {isPending ? "확인 중..." : "인증 완료"}
        </button>
      </form>
    </div>
  );
}
