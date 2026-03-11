import { getAuthProviderLabel } from "@/lib/social-auth";

type ProfileSocialAccountConnectionsProps = {
  authProvider?: string | null;
  hasPassword: boolean;
};

function getLoginMethodDescription(authProvider?: string | null, hasPassword?: boolean) {
  const normalized = typeof authProvider === "string" ? authProvider.trim().toLowerCase() : "";

  if (!normalized || normalized === "credentials" || normalized === "email") {
    return hasPassword
      ? "이메일과 비밀번호로 로그인하는 계정입니다."
      : "이메일 로그인 계정입니다.";
  }

  return `${getAuthProviderLabel(authProvider)}로 로그인하는 계정입니다.`;
}

export function ProfileSocialAccountConnections({
  authProvider,
  hasPassword,
}: ProfileSocialAccountConnectionsProps) {
  const loginMethodLabel = getAuthProviderLabel(authProvider);
  const loginMethodDescription = getLoginMethodDescription(authProvider, hasPassword);

  return (
    <section className="tp-card p-5 sm:p-6" data-testid="profile-social-account-connections">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="tp-text-section-title text-[#153a6a]">로그인 수단</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            가입 또는 로그인할 때 선택한 방식으로 이 계정을 사용합니다.
          </p>
        </div>
        <div className="rounded-lg border border-[#dbe5f3] bg-[#f8fbff] px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#5d7aa3]">
            로그인 방식
          </div>
          <div className="mt-1 text-sm font-semibold text-[#1f3f71]">{loginMethodLabel}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#dbe5f3] bg-white px-4 py-3">
        <p className="text-sm font-semibold text-[#1f3f71]">{loginMethodLabel}</p>
        <p className="mt-1 text-xs text-[#5a7398]">{loginMethodDescription}</p>
      </div>
    </section>
  );
}
