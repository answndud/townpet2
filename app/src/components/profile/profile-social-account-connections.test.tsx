import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProfileSocialAccountConnections } from "@/components/profile/profile-social-account-connections";

describe("ProfileSocialAccountConnections", () => {
  it("shows only the current email login method without social connection options", () => {
    const html = renderToStaticMarkup(
      <ProfileSocialAccountConnections authProvider="email" hasPassword />,
    );

    expect(html).toContain("로그인 수단");
    expect(html).toContain("로그인 방식");
    expect(html).toContain("이메일");
    expect(html).not.toContain("카카오 연동 준비 중");
    expect(html).not.toContain("네이버 연동 준비 중");
    expect(html).not.toContain("연결하기");
    expect(html).not.toContain("해제");
  });

  it("shows the active social login method without alternative options", () => {
    const html = renderToStaticMarkup(
      <ProfileSocialAccountConnections authProvider="kakao" hasPassword={false} />,
    );

    expect(html).toContain("카카오");
    expect(html).not.toContain("네이버");
    expect(html).not.toContain("연결하기");
  });
});
