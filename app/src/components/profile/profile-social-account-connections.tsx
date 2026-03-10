"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  buildSocialAccountLinkedNotice,
  getAuthProviderLabel,
  getSocialAuthProviderLabel,
  normalizeSocialAuthProvider,
  SOCIAL_AUTH_PROVIDERS,
  type SocialAuthProvider,
} from "@/lib/social-auth";
import {
  clearPendingOAuthLinkIntent,
  rememberPendingOAuthLinkIntent,
} from "@/lib/oauth-link-intent";

type ProfileSocialAccountConnectionsProps = {
  authProvider?: string | null;
  hasPassword: boolean;
  linkedAccountProviders: readonly string[];
  kakaoEnabled: boolean;
  kakaoDevMode: boolean;
  naverEnabled: boolean;
  naverDevMode: boolean;
  socialDevEnabled: boolean;
};

export function ProfileSocialAccountConnections({
  authProvider,
  hasPassword,
  linkedAccountProviders,
  kakaoEnabled,
  kakaoDevMode,
  naverEnabled,
  naverDevMode,
  socialDevEnabled,
}: ProfileSocialAccountConnectionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, startTransition] = useTransition();
  const [pendingProviderId, setPendingProviderId] = useState<SocialAuthProvider | null>(null);

  useEffect(() => {
    clearPendingOAuthLinkIntent();
  }, []);

  const linkedProviders = useMemo(
    () =>
      new Set(
        linkedAccountProviders
          .map((provider) => normalizeSocialAuthProvider(provider))
          .filter((provider): provider is SocialAuthProvider => provider !== null),
      ),
    [linkedAccountProviders],
  );

  const providerStates = {
    kakao: { enabled: kakaoEnabled, devMode: kakaoDevMode },
    naver: { enabled: naverEnabled, devMode: naverDevMode },
  } as const;

  const handleConnect = (provider: SocialAuthProvider) => {
    const providerState = providerStates[provider];
    if (!providerState.enabled || linkedProviders.has(provider)) {
      return;
    }

    setError(null);
    setPendingProviderId(provider);

    startTransition(async () => {
      try {
        if (providerState.devMode && socialDevEnabled) {
          const response = await fetch("/api/auth/social-dev/link", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({ provider }),
          });

          const payload = (await response.json()) as
            | { ok: true; data: { provider: SocialAuthProvider; alreadyLinked: boolean } }
            | { ok: false; error?: { message?: string } };

          if (!response.ok || !payload.ok) {
            setError(payload.ok ? "연결에 실패했습니다." : payload.error?.message ?? "연결에 실패했습니다.");
            return;
          }

          clearPendingOAuthLinkIntent();
          router.replace(`/profile?notice=${buildSocialAccountLinkedNotice(provider)}`);
          router.refresh();
          return;
        }

        if (providerState.devMode) {
          setError("현재는 실제 소셜 로그인 설정이 없어 연결할 수 없습니다.");
          return;
        }

        rememberPendingOAuthLinkIntent({
          provider,
          returnPath: "/profile",
        });
        await signIn(provider, {
          callbackUrl: `/profile?notice=${buildSocialAccountLinkedNotice(provider)}`,
        });
      } finally {
        setPendingProviderId(null);
      }
    });
  };

  return (
    <section className="tp-card p-5 sm:p-6" data-testid="profile-social-account-connections">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="tp-text-section-title text-[#153a6a]">계정 연동</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            기존 로그인 방식으로 먼저 접속한 뒤 카카오·네이버 로그인을 같은 계정에 연결할 수 있습니다.
          </p>
        </div>
        <div className="rounded-lg border border-[#dbe5f3] bg-[#f8fbff] px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#5d7aa3]">
            현재 로그인
          </div>
          <div className="mt-1 text-sm font-semibold text-[#1f3f71]">
            {getAuthProviderLabel(authProvider)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-[#355988]">
        <div>이메일 로그인: {hasPassword ? "설정됨" : "미설정"}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span>연결된 소셜 로그인:</span>
          {SOCIAL_AUTH_PROVIDERS.some((provider) => linkedProviders.has(provider)) ? (
            SOCIAL_AUTH_PROVIDERS.filter((provider) => linkedProviders.has(provider)).map(
              (provider) => (
                <span
                  key={provider}
                  className="rounded-full border border-[#c8daf5] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#315b9a]"
                >
                  {getSocialAuthProviderLabel(provider)}
                </span>
              ),
            )
          ) : (
            <span className="text-xs text-[#5a7398]">없음</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SOCIAL_AUTH_PROVIDERS.map((provider) => {
          const providerState = providerStates[provider];
          const isLinked = linkedProviders.has(provider);
          const isPendingForProvider = pendingProvider && pendingProviderId === provider;
          const label = getSocialAuthProviderLabel(provider);

          if (!providerState.enabled) {
            return (
              <span
                key={provider}
                className="inline-flex min-h-9 items-center rounded-sm border border-dashed border-[#d2dceb] px-3 text-xs font-medium text-[#7890b2]"
              >
                {label} 연동 준비 중
              </span>
            );
          }

          if (isLinked) {
            return (
              <span
                key={provider}
                data-testid={`profile-social-provider-linked-${provider}`}
                className="inline-flex min-h-9 items-center rounded-sm border border-[#c8daf5] bg-[#f8fbff] px-3 text-xs font-semibold text-[#315b9a]"
              >
                {label} 연결됨
              </span>
            );
          }

          return (
            <button
              key={provider}
              type="button"
              data-testid={`profile-social-connect-${provider}`}
              onClick={() => handleConnect(provider)}
              disabled={Boolean(isPendingForProvider)}
              className="tp-btn-soft tp-btn-sm min-h-9 px-3 text-xs font-semibold text-[#315484] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPendingForProvider ? `${label} 연결 중...` : `${label} 연결하기`}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-xs font-medium text-rose-700" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </section>
  );
}
