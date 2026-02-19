"use client";

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

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("로그인에 실패했습니다. 이메일 인증 여부를 확인해 주세요.");
        return;
      }

      router.push(result?.url ?? callbackUrl);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        이메일
        <input
          data-testid="login-email"
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
          data-testid="login-password"
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
        data-testid="login-submit"
        type="submit"
        className="border border-[#3567b5] bg-[#3567b5] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
        disabled={isPending}
      >
        {isPending ? "로그인 중..." : "이메일로 시작"}
      </button>
      {kakaoEnabled || naverEnabled ? (
        <>
          <div className="my-1 border-t border-[#d8e4f6]" />
          <div className="flex flex-col gap-2">
            {kakaoEnabled ? (
              <KakaoSignInButton
                label="카카오로 1초 로그인"
                callbackUrl={callbackUrl}
                devMode={kakaoDevMode}
                socialDevEnabled={socialDevEnabled}
              />
            ) : null}
            {naverEnabled ? (
              <NaverSignInButton
                label="네이버로 1초 로그인"
                callbackUrl={callbackUrl}
                devMode={naverDevMode}
                socialDevEnabled={socialDevEnabled}
              />
            ) : null}
          </div>
        </>
      ) : null}
      {oauthMessage ? <p className="text-xs text-rose-600">{oauthMessage}</p> : null}
    </form>
  );
}
