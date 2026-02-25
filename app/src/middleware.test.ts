import { describe, expect, it } from "vitest";

import { resolveCspHeaders } from "../middleware";

describe("resolveCspHeaders", () => {
  it("uses report-only strict CSP in production by default", () => {
    const result = resolveCspHeaders({ nodeEnv: "production" });

    expect(result.csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(result.cspReportOnly).toContain("script-src 'self' https:");
    expect(result.cspReportOnly).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("enforces strict CSP when CSP_ENFORCE_STRICT is enabled", () => {
    const result = resolveCspHeaders({
      nodeEnv: "production",
      cspEnforceStrict: "1",
    });

    expect(result.csp).toContain("script-src 'self' https:");
    expect(result.csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(result.cspReportOnly).toBeNull();
  });

  it("keeps development CSP without report-only", () => {
    const result = resolveCspHeaders({ nodeEnv: "development" });

    expect(result.csp).toContain("'unsafe-eval'");
    expect(result.cspReportOnly).toBeNull();
  });
});
