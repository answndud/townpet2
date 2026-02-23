import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    devShowKakao?: string;
    devShowNaver?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const isLocalPreview = process.env.NODE_ENV !== "production";
  const kakaoEnabledByEnv = Boolean(
    process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET,
  );
  const kakaoEnabledByDevFlag = isLocalPreview && resolvedParams.devShowKakao === "1";
  const kakaoEnabledByLocalPreview = isLocalPreview;
  const kakaoEnabled =
    kakaoEnabledByEnv || kakaoEnabledByDevFlag || kakaoEnabledByLocalPreview;
  const naverEnabledByEnv = Boolean(
    process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET,
  );
  const naverEnabledByDevFlag = isLocalPreview && resolvedParams.devShowNaver === "1";
  const naverEnabledByLocalPreview = isLocalPreview;
  const naverEnabled =
    naverEnabledByEnv || naverEnabledByDevFlag || naverEnabledByLocalPreview;
  const socialDevEnabled =
    isLocalPreview &&
    process.env.ENABLE_SOCIAL_DEV_LOGIN === "1";

  return (
    <AuthPageLayout
      eyebrow="계정 접속"
      title="로그인"
      description="가입한 이메일과 비밀번호로 로그인해 주세요."
      form={
        <LoginForm
          kakaoEnabled={kakaoEnabled}
          kakaoDevMode={isLocalPreview && !kakaoEnabledByEnv}
          naverEnabled={naverEnabled}
          naverDevMode={isLocalPreview && !naverEnabledByEnv}
          socialDevEnabled={socialDevEnabled}
        />
      }
      primaryFooterLink={{ href: "/register", label: "회원가입" }}
      secondaryFooterLinks={[
        { href: "/verify-email", label: "이메일 인증" },
        { href: "/", label: "홈으로 돌아가기" },
      ]}
    />
  );
}
