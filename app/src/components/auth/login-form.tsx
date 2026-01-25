"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        name: name || undefined,
        redirect: true,
        callbackUrl: "/onboarding",
      });

      if (result?.error) {
        setError("로그인에 실패했습니다. 이메일을 확인해 주세요.");
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
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <button
        type="submit"
        className="rounded-full bg-[#2a241c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
        disabled={isPending}
      >
        {isPending ? "로그인 중..." : "이메일로 시작"}
      </button>
    </form>
  );
}
