import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/search/log/route";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { recordSearchTerm } from "@/server/queries/search.queries";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/queries/search.queries", () => ({ recordSearchTerm: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockRecordSearchTerm = vi.mocked(recordSearchTerm);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("POST /api/search/log contract", () => {
  beforeEach(() => {
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockRecordSearchTerm.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockRecordSearchTerm.mockResolvedValue({ ok: true });
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("returns INVALID_INPUT for malformed payload", async () => {
    const request = new Request("http://localhost/api/search/log", {
      method: "POST",
      body: JSON.stringify({ q: "a" }),
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

  it("uses user rate key when authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/search/log", {
      method: "POST",
      body: JSON.stringify({ q: "강아지 산책" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "search-log:user:user-1",
      limit: 30,
      windowMs: 60_000,
      cacheMs: 500,
    });
  });

  it("falls back to guest key when auth lookup fails", async () => {
    mockGetCurrentUserId.mockRejectedValue(new Error("auth fail"));
    const request = new Request("http://localhost/api/search/log", {
      method: "POST",
      body: JSON.stringify({ q: "강아지 산책" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "search-log:ip:127.0.0.1",
      limit: 30,
      windowMs: 60_000,
      cacheMs: 500,
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("rate fail"));
    const request = new Request("http://localhost/api/search/log", {
      method: "POST",
      body: JSON.stringify({ q: "강아지 산책" }),
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

  it("maps ServiceError status/code from rate-limit", async () => {
    mockEnforceRateLimit.mockRejectedValue(
      new ServiceError("too many", "RATE_LIMITED", 429),
    );
    const request = new Request("http://localhost/api/search/log", {
      method: "POST",
      body: JSON.stringify({ q: "강아지 산책" }),
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
