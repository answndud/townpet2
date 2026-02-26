import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetCspReportStatsForTest,
  GET,
  POST,
} from "@/app/api/security/csp-report/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { logger } from "@/server/logger";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockLoggerWarn = vi.mocked(logger.warn);

describe("POST /api/security/csp-report contract", () => {
  beforeEach(() => {
    __resetCspReportStatsForTest();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockLoggerWarn.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();

    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("HEALTH_INTERNAL_TOKEN", "health-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 204 and logs sanitized report", async () => {
    const request = new Request("http://localhost/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        "csp-report": {
          "document-uri": "https://townpet.dev/feed",
          "violated-directive": "script-src",
          "blocked-uri": "https://evil.example/script.js",
        },
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockEnforceRateLimit).toHaveBeenCalledOnce();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "CSP violation report",
      expect.objectContaining({
        clientIp: "127.0.0.0",
        report: expect.objectContaining({
          violatedDirective: "script-src",
          documentUri: "https://townpet.dev/feed",
          blockedUri: "https://evil.example/script.js",
        }),
      }),
    );
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("backend down"));

    const request = new Request("http://localhost/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });

  it("returns aggregated stats for authorized internal request", async () => {
    const reportRequest = new Request("http://localhost/api/security/csp-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        "csp-report": {
          "document-uri": "https://townpet.dev/feed",
          "violated-directive": "script-src",
          "blocked-uri": "https://evil.example/script.js",
        },
      }),
    }) as NextRequest;
    await POST(reportRequest);

    const statsRequest = new Request("http://localhost/api/security/csp-report", {
      method: "GET",
      headers: { "x-health-token": "health-secret" },
    }) as NextRequest;

    const response = await GET(statsRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.totalBuckets).toBe(1);
    expect(payload.data.top[0]).toMatchObject({
      count: 1,
      sample: {
        violatedDirective: "script-src",
      },
    });
  });

  it("rejects stats access without internal token", async () => {
    const request = new Request("http://localhost/api/security/csp-report", {
      method: "GET",
    }) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});
