import { describe, expect, it } from "vitest";

import {
  buildSocialAccountLinkedNotice,
  buildSocialAccountUnlinkedNotice,
  buildSocialAccountProviderAlreadyConnectedNotice,
  getAuthProviderLabel,
  getOAuthErrorMessage,
  getSocialAccountNoticeMessage,
  getSocialAuthProviderLabel,
  normalizeSocialAuthProvider,
} from "@/lib/social-auth";

describe("social auth helpers", () => {
  it("normalizes provider labels and auth provider labels", () => {
    expect(normalizeSocialAuthProvider(" KAKAO ")).toBe("kakao");
    expect(getSocialAuthProviderLabel("naver")).toBe("네이버");
    expect(getAuthProviderLabel("credentials")).toBe("이메일");
    expect(getAuthProviderLabel("kakao")).toBe("카카오");
  });

  it("returns success and conflict notices for linked providers", () => {
    expect(
      getSocialAccountNoticeMessage(buildSocialAccountLinkedNotice("kakao")),
    ).toContain("카카오 로그인을 이 계정에 연결했습니다.");

    expect(
      getSocialAccountNoticeMessage(buildSocialAccountUnlinkedNotice("kakao")),
    ).toContain("카카오 로그인을 이 계정에서 해제했습니다.");

    expect(
      getSocialAccountNoticeMessage(
        buildSocialAccountProviderAlreadyConnectedNotice("naver"),
      ),
    ).toContain("이미 네이버 로그인이 연결되어 있습니다.");
  });

  it("returns link-specific recovery guidance for OAuthAccountNotLinked", () => {
    expect(
      getOAuthErrorMessage("OAuthAccountNotLinked", {
        pendingLinkProvider: "kakao",
      }),
    ).toContain("카카오 계정 연결에 실패했습니다.");

    expect(getOAuthErrorMessage("OAuthAccountNotLinked")).toContain(
      "프로필에서 소셜 로그인을 연결",
    );
  });
});
