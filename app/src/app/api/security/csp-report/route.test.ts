import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/security/csp-report/route";
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
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockLoggerWarn.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
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
        clientIp: "127.0.0.1",
        report: expect.objectContaining({
          violatedDirective: "script-src",
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
});
