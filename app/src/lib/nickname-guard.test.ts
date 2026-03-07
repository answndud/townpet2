import { describe, expect, it } from "vitest";

import {
  hasCompletedNicknameSetup,
  shouldRedirectToProfileForNicknameGuard,
} from "@/lib/nickname-guard";

describe("nickname guard", () => {
  it("treats non-empty nickname as completed", () => {
    expect(hasCompletedNicknameSetup("townpet")).toBe(true);
    expect(hasCompletedNicknameSetup("  townpet  ")).toBe(true);
  });

  it("treats blank nickname as incomplete", () => {
    expect(hasCompletedNicknameSetup("")).toBe(false);
    expect(hasCompletedNicknameSetup("   ")).toBe(false);
    expect(hasCompletedNicknameSetup(null)).toBe(false);
  });

  it("requires profile redirect only for authenticated users missing nickname", () => {
    expect(
      shouldRedirectToProfileForNicknameGuard({
        isAuthenticated: true,
        nickname: null,
      }),
    ).toBe(true);
    expect(
      shouldRedirectToProfileForNicknameGuard({
        isAuthenticated: false,
        nickname: null,
      }),
    ).toBe(false);
    expect(
      shouldRedirectToProfileForNicknameGuard({
        isAuthenticated: true,
        nickname: "townpet",
      }),
    ).toBe(false);
  });
});
