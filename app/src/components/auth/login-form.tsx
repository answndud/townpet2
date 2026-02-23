"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { KakaoSignInButton } from "@/components/auth/kakao-signin-button";
import { NaverSignInButton } from "@/components/auth/naver-signin-button";

type LoginFormProps = {
  kakaoEnabled?: boolean;
  kakaoDevMode?: boolean;
  naverEnabled?: boolean;
  naverDevMode?: boolean;
  socialDevEnabled?: boolean;
};

export function LoginForm({
  kakaoEnabled = false,
  kakaoDevMode = false,
  naverEnabled = false,
  naverDevMode = false,
  socialDevEnabled = false,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const oauthError = searchParams.get("error");
  const nextPath = searchParams.get("next");
  const callbackUrl =
    nextPath && nextPath.startsWith("/") ? nextPath : "/onboarding";

  const oauthMessage = useMemo(() => {
    if (!oauthError) return null;
    if (oauthError === "KAKAO_EMAIL_REQUIRED") {
      return "카카오 계정 이메일 제공 동의가 필요합니다. 동의 후 다시 시도해 주세요.";
    }
    if (oauthError === "NAVER_EMAIL_REQUIRED") {
      return "네이버 계정 이메일 제공 동의가 필요합니다. 동의 후 다시 시도해 주세요.";
    }
    return "소셜 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }, [oauthError]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCapsLockOn(false);

    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("로그인에 실패했습니다. 입력 정보를 확인하고 다시 시도해 주세요.");
        return;
      }

      router.push(result?.url ?? callbackUrl);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#274b7a]">
        이메일
        <input
          data-testid="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          className="min-h-11 rounded-sm border border-[#adc3e6] bg-[#f7faff] px-3 py-2 text-sm text-[#1f3f71] placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@townpet.dev"
          required
          aria-invalid={Boolean(error)}
        />
      </label>
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium text-[#274b7a]">비밀번호</span>
        <Link
          href="/password/reset"
          className="text-xs font-medium text-[#46628c] underline-offset-2 transition hover:text-[#1f3f71] hover:underline"
        >
          비밀번호 재설정
        </Link>
      </div>
      <div className="flex gap-2">
        <input
          data-testid="login-password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          className="min-h-11 flex-1 rounded-sm border border-[#adc3e6] bg-[#f7faff] px-3 py-2 text-sm text-[#1f3f71] placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLockOn(false)}
          placeholder="비밀번호를 입력해 주세요"
          required
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="min-h-11 min-w-20 rounded-sm border border-[#adc3e6] bg-white px-3 text-xs font-semibold text-[#2a4e7d] transition hover:bg-[#edf3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          aria-pressed={showPassword}
        >
          {showPassword ? "숨기기" : "보기"}
        </button>
      </div>
      {capsLockOn ? (
        <p className="text-xs text-amber-700" role="status" aria-live="polite">
          Caps Lock이 켜져 있습니다.
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-rose-700" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        data-testid="login-submit"
        type="submit"
        className="min-h-11 rounded-sm border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
        disabled={isPending || !email.trim() || !password}
      >
        {isPending ? "로그인 중..." : "이메일로 로그인"}
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
                label="카카오로 로그인"
                callbackUrl={callbackUrl}
                devMode={kakaoDevMode}
                socialDevEnabled={socialDevEnabled}
              />
            ) : null}
            {naverEnabled ? (
              <NaverSignInButton
                label="네이버로 로그인"
                callbackUrl={callbackUrl}
                devMode={naverDevMode}
                socialDevEnabled={socialDevEnabled}
              />
            ) : null}
          </div>
        </>
      ) : null}
      {oauthMessage ? (
        <p className="text-xs font-medium text-rose-700" role="alert" aria-live="polite">
          {oauthMessage}
        </p>
      ) : null}
    </form>
  );
}
