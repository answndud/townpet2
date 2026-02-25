import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/register/route";
import { sendVerificationEmail } from "@/server/email";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  registerUser,
  requestEmailVerification,
} from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/email", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/auth.service", () => ({
  registerUser: vi.fn(),
  requestEmailVerification: vi.fn(),
}));

const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockRegisterUser = vi.mocked(registerUser);
const mockRequestEmailVerification = vi.mocked(requestEmailVerification);

describe("POST /api/auth/register contract", () => {
  beforeEach(() => {
    mockSendVerificationEmail.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockRegisterUser.mockReset();
    mockRequestEmailVerification.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("returns INVALID_INPUT for malformed payload", async () => {
    const request = new Request("http://localhost/api/auth/register", {
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

  it("maps register service errors to status/code", async () => {
    mockRegisterUser.mockRejectedValue(
      new ServiceError("taken", "EMAIL_TAKEN", 409),
    );
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
        nickname: "townpet_user",
        name: "user",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "EMAIL_TAKEN" },
    });
  });

  it("returns 201 and sends verification email", async () => {
    mockRegisterUser.mockResolvedValue({
      id: "u1",
      email: "user@townpet.dev",
      name: "user",
      nickname: null,
    });
    mockRequestEmailVerification.mockResolvedValue({ token: "verify-token" });
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
        nickname: "townpet_user",
        name: "user",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({ ok: true, data: { email: "user@townpet.dev" } });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: "user@townpet.dev",
      token: "verify-token",
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("ratelimit backend down"));
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "password123",
        nickname: "townpet_user",
      }),
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
