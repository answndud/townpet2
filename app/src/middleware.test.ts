import { describe, expect, it } from "vitest";

import {
  isGuestPostDetailPath,
  isPrefetchRequest,
  isNicknameRequiredProfilePath,
  resolveCspHeaders,
} from "../middleware";

describe("resolveCspHeaders", () => {
  it("uses report-only strict CSP in production by default", () => {
    const result = resolveCspHeaders({ nodeEnv: "production", nonce: "nonce-a" });

    expect(result.csp).toContain("script-src 'self' 'nonce-nonce-a' https: 'unsafe-inline'");
    expect(result.cspReportOnly).toContain("script-src 'self' 'nonce-nonce-a' https:");
    expect(result.cspReportOnly).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("enforces strict CSP when CSP_ENFORCE_STRICT is enabled", () => {
    const result = resolveCspHeaders({
      nodeEnv: "production",
      cspEnforceStrict: "1",
      nonce: "nonce-b",
    });

    expect(result.csp).toContain("script-src 'self' 'nonce-nonce-b' https:");
    expect(result.csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(result.cspReportOnly).toBeNull();
  });

  it("keeps development CSP without report-only", () => {
    const result = resolveCspHeaders({ nodeEnv: "development", nonce: "nonce-c" });

    expect(result.csp).toContain("'unsafe-eval'");
    expect(result.csp).toContain("'nonce-nonce-c'");
    expect(result.cspReportOnly).toBeNull();
  });
});

describe("isGuestPostDetailPath", () => {
  const postId = "c1234567890abcdefghijklmn";

  it("returns true for post detail id path", () => {
    expect(isGuestPostDetailPath(`/posts/${postId}`)).toBe(true);
  });

  it("returns true for guest detail path", () => {
    expect(isGuestPostDetailPath(`/posts/${postId}/guest`)).toBe(true);
  });

  it("returns false for new post path", () => {
    expect(isGuestPostDetailPath("/posts/new")).toBe(false);
  });

  it("returns false for edit path", () => {
    expect(isGuestPostDetailPath(`/posts/${postId}/edit`)).toBe(false);
  });

  it("returns false for non-id path", () => {
    expect(isGuestPostDetailPath("/posts/not-an-id")).toBe(false);
  });
});

describe("isNicknameRequiredProfilePath", () => {
  it("allows profile path", () => {
    expect(isNicknameRequiredProfilePath("/profile")).toBe(true);
  });

  it("allows profile sub-path", () => {
    expect(isNicknameRequiredProfilePath("/profile/security")).toBe(true);
  });

  it("allows api path", () => {
    expect(isNicknameRequiredProfilePath("/api/auth/session")).toBe(true);
  });

  it("blocks feed path", () => {
    expect(isNicknameRequiredProfilePath("/feed")).toBe(false);
  });
});

describe("isPrefetchRequest", () => {
  it("returns true when purpose header is prefetch", () => {
    const headers = new Headers({ purpose: "prefetch" });
    expect(isPrefetchRequest(headers)).toBe(true);
  });

  it("returns true when next-router-prefetch header is set", () => {
    const headers = new Headers({ "next-router-prefetch": "1" });
    expect(isPrefetchRequest(headers)).toBe(true);
  });

  it("returns false for normal request headers", () => {
    const headers = new Headers();
    expect(isPrefetchRequest(headers)).toBe(false);
  });
});
