import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/verify/request/route";
import { sendVerificationEmail } from "@/server/email";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { requestEmailVerification } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/email", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/auth.service", () => ({
  requestEmailVerification: vi.fn(),
}));

const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockRequestEmailVerification = vi.mocked(requestEmailVerification);

describe("POST /api/auth/verify/request contract", () => {
  beforeEach(() => {
    mockSendVerificationEmail.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockRequestEmailVerification.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("returns INVALID_INPUT for malformed payload", async () => {
    const request = new Request("http://localhost/api/auth/verify/request", {
      method: "POST",
      body: JSON.stringify({ email: "bad-email" }),
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

  it("returns 200 and sends verification email when token exists", async () => {
    mockRequestEmailVerification.mockResolvedValue({ token: "verify-token" });
    const request = new Request("http://localhost/api/auth/verify/request", {
      method: "POST",
      body: JSON.stringify({ email: "user@townpet.dev" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, data: { token: "verify-token" } });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: "user@townpet.dev",
      token: "verify-token",
    });
  });

  it("returns 503 when verification email delivery is unavailable", async () => {
    mockRequestEmailVerification.mockResolvedValue({ token: "verify-token" });
    mockSendVerificationEmail.mockRejectedValue(
      new ServiceError("mail unavailable", "EMAIL_DELIVERY_UNAVAILABLE", 503),
    );
    const request = new Request("http://localhost/api/auth/verify/request", {
      method: "POST",
      body: JSON.stringify({ email: "user@townpet.dev" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "EMAIL_DELIVERY_UNAVAILABLE" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("ratelimit backend down"));
    const request = new Request("http://localhost/api/auth/verify/request", {
      method: "POST",
      body: JSON.stringify({ email: "user@townpet.dev" }),
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
});
