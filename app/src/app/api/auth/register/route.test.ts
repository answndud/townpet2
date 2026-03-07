import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/register/route";
import { recordAuthAuditEvent } from "@/server/auth-audit-log";
import {
  buildRegisterPreValidationRateLimitRules,
  buildRegisterValidatedRateLimitRules,
  enforceRegisterRateLimitRules,
} from "@/server/auth-register-rate-limit";
import { sendVerificationEmail } from "@/server/email";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import {
  registerUser,
  requestEmailVerification,
} from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth-audit-log", () => ({ recordAuthAuditEvent: vi.fn() }));
vi.mock("@/server/auth-register-rate-limit", () => ({
  buildRegisterPreValidationRateLimitRules: vi.fn(),
  buildRegisterValidatedRateLimitRules: vi.fn(),
  enforceRegisterRateLimitRules: vi.fn(),
}));
vi.mock("@/server/email", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/services/auth.service", () => ({
  registerUser: vi.fn(),
  requestEmailVerification: vi.fn(),
}));

const mockRecordAuthAuditEvent = vi.mocked(recordAuthAuditEvent);
const mockBuildRegisterPreValidationRateLimitRules = vi.mocked(
  buildRegisterPreValidationRateLimitRules,
);
const mockBuildRegisterValidatedRateLimitRules = vi.mocked(
  buildRegisterValidatedRateLimitRules,
);
const mockEnforceRegisterRateLimitRules = vi.mocked(enforceRegisterRateLimitRules);
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockRegisterUser = vi.mocked(registerUser);
const mockRequestEmailVerification = vi.mocked(requestEmailVerification);

describe("POST /api/auth/register contract", () => {
  beforeEach(() => {
    mockRecordAuthAuditEvent.mockReset();
    mockBuildRegisterPreValidationRateLimitRules.mockReset();
    mockBuildRegisterValidatedRateLimitRules.mockReset();
    mockEnforceRegisterRateLimitRules.mockReset();
    mockSendVerificationEmail.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockRegisterUser.mockReset();
    mockRequestEmailVerification.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockBuildRegisterPreValidationRateLimitRules.mockReturnValue([
      {
        key: "auth:register:ip:127.0.0.1",
        limit: 6,
        windowMs: 600_000,
        reasonCode: "REGISTER_RATE_LIMIT_IP",
      },
    ]);
    mockBuildRegisterValidatedRateLimitRules.mockReturnValue([
      {
        key: "auth:register:email:hash",
        limit: 5,
        windowMs: 86_400_000,
        reasonCode: "REGISTER_RATE_LIMIT_EMAIL",
      },
    ]);
    mockEnforceRegisterRateLimitRules.mockImplementation(async () => ({ limited: false }));
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
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith({
      action: "REGISTER_REJECTED",
      email: "bad-email",
      ipAddress: "127.0.0.1",
      userAgent: null,
      reasonCode: "INVALID_INPUT",
    });
  });

  it("returns INVALID_INPUT for invalid json bodies", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: "{invalid-json",
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith({
      action: "REGISTER_REJECTED",
      ipAddress: "127.0.0.1",
      userAgent: null,
      reasonCode: "INVALID_JSON",
    });
  });

  it("normalizes duplicate account signals", async () => {
    mockRegisterUser.mockRejectedValue(
      new ServiceError("taken", "EMAIL_TAKEN", 409),
    );
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
        nickname: "townpet_user",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "REGISTER_REJECTED" },
    });
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith({
      action: "REGISTER_REJECTED",
      email: "user@townpet.dev",
      ipAddress: "127.0.0.1",
      userAgent: null,
      reasonCode: "EMAIL_TAKEN",
    });
  });

  it("normalizes duplicate nickname signals", async () => {
    mockRegisterUser.mockRejectedValue(
      new ServiceError("taken", "NICKNAME_TAKEN", 409),
    );
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
        nickname: "townpet_user",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "REGISTER_REJECTED" },
    });
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith({
      action: "REGISTER_REJECTED",
      email: "user@townpet.dev",
      ipAddress: "127.0.0.1",
      userAgent: null,
      reasonCode: "NICKNAME_TAKEN",
    });
  });

  it("returns 429 and records register rate limit audits", async () => {
    mockEnforceRegisterRateLimitRules.mockReset();
    mockEnforceRegisterRateLimitRules.mockResolvedValueOnce({
      limited: true,
      reasonCode: "REGISTER_RATE_LIMIT_IP",
    });
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
        nickname: "townpet_user",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith({
      action: "REGISTER_RATE_LIMITED",
      ipAddress: "127.0.0.1",
      userAgent: null,
      reasonCode: "REGISTER_RATE_LIMIT_IP",
    });
  });

  it("returns 201 and sends verification email", async () => {
    mockRegisterUser.mockResolvedValue({
      id: "u1",
      email: "user@townpet.dev",
      nickname: null,
    });
    mockRequestEmailVerification.mockResolvedValue({ token: "verify-token" });
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
        nickname: "townpet_user",
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
    expect(mockRecordAuthAuditEvent).toHaveBeenCalledWith({
      action: "REGISTER_SUCCESS",
      userId: "u1",
      email: "user@townpet.dev",
      ipAddress: "127.0.0.1",
      userAgent: null,
    });
  });

  it("returns 503 when verification email delivery is unavailable", async () => {
    mockRegisterUser.mockResolvedValue({
      id: "u1",
      email: "user@townpet.dev",
      nickname: null,
    });
    mockRequestEmailVerification.mockResolvedValue({ token: "verify-token" });
    mockSendVerificationEmail.mockRejectedValue(
      new ServiceError("mail unavailable", "EMAIL_DELIVERY_UNAVAILABLE", 503),
    );
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
        nickname: "townpet_user",
      }),
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
    mockEnforceRegisterRateLimitRules.mockReset();
    mockEnforceRegisterRateLimitRules.mockRejectedValue(new Error("ratelimit backend down"));
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@townpet.dev",
        password: "Townpet!2026",
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
