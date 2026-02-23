import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { RegisterForm } from "@/components/auth/register-form";

type RegisterPageProps = {
  searchParams?: Promise<{
    devShowKakao?: string;
    devShowNaver?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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
      eyebrow="계정 가입"
      title="회원가입"
      description="이메일과 비밀번호로 TownPet을 시작해 보세요."
      form={
        <RegisterForm
          kakaoEnabled={kakaoEnabled}
          kakaoDevMode={isLocalPreview && !kakaoEnabledByEnv}
          naverEnabled={naverEnabled}
          naverDevMode={isLocalPreview && !naverEnabledByEnv}
          socialDevEnabled={socialDevEnabled}
        />
      }
      primaryFooterLink={{ href: "/login", label: "로그인" }}
      secondaryFooterLinks={[{ href: "/", label: "홈으로 돌아가기" }]}
    />
  );
}
