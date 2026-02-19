"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/onboarding",
      });

      if (result?.error) {
        setError("로그인에 실패했습니다. 이메일 인증 여부를 확인해 주세요.");
        return;
      }

      router.push(result?.url ?? "/onboarding");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        비밀번호
        <input
          type="password"
          className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="********"
          required
        />
      </label>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <button
        type="submit"
        className="border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
        disabled={isPending}
      >
        {isPending ? "로그인 중..." : "이메일로 시작"}
      </button>
    </form>
  );
}
