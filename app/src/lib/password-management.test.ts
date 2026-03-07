import { describe, expect, it } from "vitest";

import {
  PASSWORD_MANAGEMENT_UNAVAILABLE_NOTICE,
  buildPasswordManagementUnavailableHref,
  canManagePassword,
  getPasswordManagementNoticeMessage,
  isSocialPasswordAuthProvider,
} from "@/lib/password-management";

describe("password management policy", () => {
  it("blocks password management when current auth provider is kakao or naver", () => {
    expect(
      canManagePassword({
        authProvider: "kakao",
        hasPassword: true,
        linkedAccountProviders: [],
      }),
    ).toBe(false);

    expect(
      canManagePassword({
        authProvider: "naver",
        hasPassword: false,
        linkedAccountProviders: [],
      }),
    ).toBe(false);
  });

  it("blocks legacy social-only sessions when no auth provider is present", () => {
    expect(
      canManagePassword({
        authProvider: null,
        hasPassword: false,
        linkedAccountProviders: ["kakao"],
      }),
    ).toBe(false);
  });

  it("allows password management for credential sessions even if social is linked", () => {
    expect(
      canManagePassword({
        authProvider: "credentials",
        hasPassword: true,
        linkedAccountProviders: ["kakao"],
      }),
    ).toBe(true);

    expect(
      canManagePassword({
        authProvider: null,
        hasPassword: true,
        linkedAccountProviders: ["naver"],
      }),
    ).toBe(true);
  });
});

describe("password management notices", () => {
  it("identifies social password auth providers", () => {
    expect(isSocialPasswordAuthProvider("KAKAO")).toBe(true);
    expect(isSocialPasswordAuthProvider("naver")).toBe(true);
    expect(isSocialPasswordAuthProvider("credentials")).toBe(false);
  });

  it("builds and resolves the unavailable notice", () => {
    expect(buildPasswordManagementUnavailableHref()).toBe(
      `/profile?notice=${PASSWORD_MANAGEMENT_UNAVAILABLE_NOTICE}`,
    );
    expect(
      getPasswordManagementNoticeMessage(PASSWORD_MANAGEMENT_UNAVAILABLE_NOTICE),
    ).toContain("비밀번호 변경");
    expect(getPasswordManagementNoticeMessage("UNKNOWN_NOTICE")).toBeNull();
  });
});
