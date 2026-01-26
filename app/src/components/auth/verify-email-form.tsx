"use client";

import { useEffect, useState, useTransition } from "react";

type VerifyEmailFormProps = {
  initialToken?: string | null;
  initialEmail?: string | null;
};

export function VerifyEmailForm({
  initialToken,
  initialEmail,
}: VerifyEmailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [token, setToken] = useState(initialToken ?? "");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    if (!initialToken || success || isVerifying) {
      return;
    }

    setIsVerifying(true);
    setError(null);

    fetch("/api/auth/verify/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: initialToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error?.message ?? "인증에 실패했습니다.");
        }
        setSuccess(true);
      })
      .catch((fetchError: unknown) => {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "인증에 실패했습니다.",
        );
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [initialToken, success, isVerifying]);

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
        <h2 className="text-base font-semibold">인증 메일 재발송</h2>
        <p className="text-xs text-[#6f6046]">
          이메일 인증은 필수입니다. 메일이 오지 않으면 다시 요청해 주세요.
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
        {requestSuccess ? (
          <p className="text-xs text-emerald-600">인증 메일을 다시 보냈습니다.</p>
        ) : null}
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
          {isPending ? "발송 중..." : "인증 메일 보내기"}
        </button>
      </form>

      <form onSubmit={handleConfirm} className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">인증 토큰 입력</h2>
        <label className="flex flex-col gap-2 text-sm font-medium">
          토큰
          <input
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="메일로 받은 토큰을 입력"
            required
          />
        </label>
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
        {success ? (
          <p className="text-xs text-emerald-600">이메일 인증이 완료되었습니다.</p>
        ) : null}
        {isVerifying ? (
          <p className="text-xs text-[#9a8462]">인증 확인 중...</p>
        ) : null}
        <button
          type="submit"
          className="rounded-full bg-[#2a241c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
          disabled={isPending}
        >
          {isPending ? "확인 중..." : "인증 완료"}
        </button>
      </form>
    </div>
  );
}
