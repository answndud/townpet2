import { describe, expect, it } from "vitest";

import { getPasswordSetupCopy, validatePasswordSetupForm } from "@/lib/password-setup";

describe("password setup copy", () => {
  it("returns change copy when account already has password", () => {
    expect(getPasswordSetupCopy(true)).toMatchObject({
      pageTitle: "비밀번호 변경",
      profileLinkLabel: "비밀번호 변경",
      submitLabel: "비밀번호 변경",
    });
  });

  it("returns setup copy when account has no password", () => {
    expect(getPasswordSetupCopy(false)).toMatchObject({
      pageTitle: "비밀번호 설정",
      profileLinkLabel: "비밀번호 설정",
      submitLabel: "비밀번호 설정",
    });
    expect(getPasswordSetupCopy(false).currentPasswordHint).not.toContain("소셜 로그인");
  });
});

describe("password setup validation", () => {
  it("requires current password when existing password must be verified", () => {
    expect(
      validatePasswordSetupForm({
        hasPassword: true,
        currentPassword: "",
        password: "Townpet!2026",
        passwordConfirm: "Townpet!2026",
      }),
    ).toBe("현재 비밀번호를 입력해 주세요.");
  });

  it("rejects mismatched password confirmation", () => {
    expect(
      validatePasswordSetupForm({
        hasPassword: false,
        currentPassword: "",
        password: "Townpet!2026",
        passwordConfirm: "Townpet!2025",
      }),
    ).toBe("비밀번호가 일치하지 않습니다.");
  });

  it("accepts valid input for first-time password setup", () => {
    expect(
      validatePasswordSetupForm({
        hasPassword: false,
        currentPassword: "",
        password: "Townpet!2026",
        passwordConfirm: "Townpet!2026",
      }),
    ).toBeNull();
  });
});
