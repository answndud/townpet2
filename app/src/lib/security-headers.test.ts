import { describe, expect, it } from "vitest";

import { buildStaticSecurityHeaders, resolveCspHeaders } from "@/lib/security-headers";

describe("resolveCspHeaders", () => {
  it("uses static fallback CSP with strict report-only policy in production", () => {
    const result = resolveCspHeaders({ nodeEnv: "production", nonce: "nonce-a" });

    expect(result.csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(result.csp).not.toContain("'nonce-nonce-a'");
    expect(result.cspReportOnly).toContain("script-src 'self' 'nonce-nonce-a'");
    expect(result.cspReportOnly).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("keeps production hydration-safe CSP even when CSP_ENFORCE_STRICT is enabled", () => {
    const result = resolveCspHeaders({
      nodeEnv: "production",
      cspEnforceStrict: "1",
      nonce: "nonce-b",
    });

    expect(result.csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(result.csp).not.toContain("'nonce-nonce-b'");
    expect(result.cspReportOnly).toContain("script-src 'self' 'nonce-nonce-b'");
  });

  it("keeps development CSP without report-only", () => {
    const result = resolveCspHeaders({ nodeEnv: "development", nonce: "nonce-c" });

    expect(result.csp).toContain("'unsafe-eval'");
    expect(result.csp).toContain("'nonce-nonce-c'");
    expect(result.cspReportOnly).toBeNull();
  });
});

describe("buildStaticSecurityHeaders", () => {
  it("builds a fallback CSP for production without middleware nonce support", () => {
    const headers = buildStaticSecurityHeaders({ nodeEnv: "production" });
    const csp = headers.find((header) => header.key === "Content-Security-Policy");
    const hsts = headers.find((header) => header.key === "Strict-Transport-Security");
    const permissionsPolicy = headers.find((header) => header.key === "Permissions-Policy");

    expect(headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]),
    );
    expect(hsts?.value).toBe("max-age=31536000");
    expect(permissionsPolicy?.value).toBe("camera=(), geolocation=(), microphone=()");
    expect(csp?.value).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp?.value).not.toContain("'unsafe-eval'");
  });

  it("omits HSTS in development while keeping Permissions-Policy", () => {
    const headers = buildStaticSecurityHeaders({ nodeEnv: "development" });
    const hsts = headers.find((header) => header.key === "Strict-Transport-Security");
    const permissionsPolicy = headers.find((header) => header.key === "Permissions-Policy");

    expect(hsts).toBeUndefined();
    expect(permissionsPolicy?.value).toBe("camera=(), geolocation=(), microphone=()");
  });
});
