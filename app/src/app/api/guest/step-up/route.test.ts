import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/guest/step-up/route";
import { issueGuestStepUpChallenge } from "@/server/guest-step-up";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/guest-step-up", () => ({
  guestStepUpScopeValues: ["post:create", "comment:create", "upload"],
  issueGuestStepUpChallenge: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockIssueGuestStepUpChallenge = vi.mocked(issueGuestStepUpChallenge);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("POST /api/guest/step-up contract", () => {
  beforeEach(() => {
    mockIssueGuestStepUpChallenge.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockIssueGuestStepUpChallenge.mockReturnValue({
      token: "token-1",
      difficulty: 2,
      expiresInSeconds: 180,
      riskLevel: "NORMAL",
      signalLabels: ["기본 guest 검증"],
    });
  });

  it("returns INVALID_INPUT for malformed scope", async () => {
    const request = new Request("http://localhost/api/guest/step-up", {
      method: "POST",
      body: JSON.stringify({ scope: "invalid" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
  });

  it("applies guest step-up rate limit and returns challenge", async () => {
    const request = new Request("http://localhost/api/guest/step-up", {
      method: "POST",
      body: JSON.stringify({ scope: "post:create" }),
      headers: {
        "content-type": "application/json",
        "x-guest-fingerprint": "guest-fp-1",
      },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "guest-step-up:post:create:ip:127.0.0.1:fp:guest-fp-1",
      limit: 20,
      windowMs: 60_000,
      cacheMs: 1_000,
    });
    expect(payload).toMatchObject({
      ok: true,
      data: { token: "token-1", difficulty: 2 },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockIssueGuestStepUpChallenge.mockImplementation(() => {
      throw new Error("boom");
    });
    const request = new Request("http://localhost/api/guest/step-up", {
      method: "POST",
      body: JSON.stringify({ scope: "upload" }),
      headers: { "content-type": "application/json" },
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

  it("maps rate limit service errors without monitoring them as unexpected", async () => {
    mockEnforceRateLimit.mockRejectedValue(
      new ServiceError("too many", "RATE_LIMITED", 429),
    );
    const request = new Request("http://localhost/api/guest/step-up", {
      method: "POST",
      body: JSON.stringify({ scope: "comment:create" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });
});
