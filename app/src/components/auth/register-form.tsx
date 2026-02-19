"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { KakaoSignInButton } from "@/components/auth/kakao-signin-button";
import { NaverSignInButton } from "@/components/auth/naver-signin-button";

type RegisterFormProps = {
  kakaoEnabled?: boolean;
  kakaoDevMode?: boolean;
  naverEnabled?: boolean;
  naverDevMode?: boolean;
};

export function RegisterForm({
  kakaoEnabled = false,
  kakaoDevMode = false,
  naverEnabled = false,
  naverDevMode = false,
}: RegisterFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const router = useRouter();

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

      setSuccess(true);
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
        이름(선택)
        <input
          className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="표시 이름"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        비밀번호
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
        비밀번호 확인
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
        <p className="text-xs text-emerald-600">
          인증 메일을 보냈습니다. 메일함을 확인해 주세요.
        </p>
      ) : null}
      <button
        type="submit"
        className="border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
        disabled={isPending}
      >
        {isPending ? "가입 중..." : "이메일로 가입"}
      </button>
      {kakaoEnabled || naverEnabled ? (
        <>
          <div className="my-1 border-t border-[#d8e4f6]" />
          <div className="flex flex-col gap-2">
            {kakaoEnabled ? (
              <KakaoSignInButton label="카카오로 빠르게 가입" devMode={kakaoDevMode} />
            ) : null}
            {naverEnabled ? (
              <NaverSignInButton label="네이버로 빠르게 가입" devMode={naverDevMode} />
            ) : null}
          </div>
        </>
      ) : null}
    </form>
  );
}
