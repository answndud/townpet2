"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "회원가입에 실패했습니다.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/onboarding",
      });

      if (result?.error) {
        setError("로그인에 실패했습니다. 다시 시도해 주세요.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <label className="flex flex-col gap-2 text-sm font-medium">
        이름(선택)
        <input
          className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="표시 이름"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        비밀번호
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
        비밀번호 확인
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
      <button
        type="submit"
        className="rounded-full bg-[#2a241c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
        disabled={isPending}
      >
        {isPending ? "가입 중..." : "이메일로 가입"}
      </button>
    </form>
  );
}
