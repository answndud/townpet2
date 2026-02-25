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
  socialDevEnabled?: boolean;
};

export function RegisterForm({
  kakaoEnabled = false,
  kakaoDevMode = false,
  naverEnabled = false,
  naverDevMode = false,
  socialDevEnabled = false,
}: RegisterFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
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
          nickname,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#274b7a]">
        이메일
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          className="min-h-11 rounded-sm border border-[#adc3e6] bg-[#f7faff] px-3 py-2 text-sm text-[#1f3f71] placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@townpet.dev"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#274b7a]">
        닉네임
        <input
          autoComplete="nickname"
          className="min-h-11 rounded-sm border border-[#adc3e6] bg-[#f7faff] px-3 py-2 text-sm text-[#1f3f71] placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="예: townpet_user"
          minLength={2}
          maxLength={20}
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#274b7a]">
        이름(선택)
        <input
          autoComplete="name"
          className="min-h-11 rounded-sm border border-[#adc3e6] bg-[#f7faff] px-3 py-2 text-sm text-[#1f3f71] placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="표시 이름"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#274b7a]">
        비밀번호
        <input
          type="password"
          autoComplete="new-password"
          className="min-h-11 rounded-sm border border-[#adc3e6] bg-[#f7faff] px-3 py-2 text-sm text-[#1f3f71] placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="최소 8자"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#274b7a]">
        비밀번호 확인
        <input
          type="password"
          autoComplete="new-password"
          className="min-h-11 rounded-sm border border-[#adc3e6] bg-[#f7faff] px-3 py-2 text-sm text-[#1f3f71] placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          placeholder="다시 입력"
          required
        />
      </label>
      {error ? (
        <p className="text-xs font-medium text-rose-700" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-xs font-medium text-emerald-700" role="status" aria-live="polite">
          인증 메일을 보냈습니다. 메일함을 확인해 주세요.
        </p>
      ) : null}
      <button
        type="submit"
        className="min-h-11 rounded-sm border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
        disabled={isPending || !email.trim() || !nickname.trim() || !password || !passwordConfirm}
      >
        {isPending ? "가입 중..." : "이메일로 가입"}
      </button>
      {kakaoEnabled || naverEnabled ? (
        <>
          <div className="my-2 flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-[#d8e4f6]" />
            <span className="text-xs font-medium text-[#5f7fa8]">또는</span>
            <div className="h-px flex-1 bg-[#d8e4f6]" />
          </div>
          <div className="flex flex-col gap-2">
            {kakaoEnabled ? (
              <KakaoSignInButton
                label="카카오로 가입"
                devMode={kakaoDevMode}
                socialDevEnabled={socialDevEnabled}
              />
            ) : null}
            {naverEnabled ? (
              <NaverSignInButton
                label="네이버로 가입"
                devMode={naverDevMode}
                socialDevEnabled={socialDevEnabled}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </form>
  );
}
