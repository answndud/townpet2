import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/upload/client/route";
import { handleUpload } from "@vercel/blob/client";
import { getCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@vercel/blob/client", () => ({ handleUpload: vi.fn() }));
vi.mock("@/server/auth", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({ getGuestPostPolicy: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockHandleUpload = vi.mocked(handleUpload);
const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestPostPolicy = vi.mocked(getGuestPostPolicy);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("POST /api/upload/client contract", () => {
  beforeEach(() => {
    mockHandleUpload.mockReset();
    mockGetCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetGuestPostPolicy.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetCurrentUserId.mockResolvedValue(null);
    mockGetGuestPostPolicy.mockResolvedValue({
      uploadRateLimit10m: 10,
    } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockHandleUpload.mockImplementation(async (params) => {
      await params.onBeforeGenerateToken("/test.png", null, false);
      return {
        type: "blob.generate-client-token",
        clientToken: "token-1",
      } as never;
    });
  });

  it("uses user rate key when authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const request = new Request("http://localhost/api/upload/client", {
      method: "POST",
      body: JSON.stringify({ type: "blob.generate-client-token" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "upload:user:user-1:ip:127.0.0.1",
      limit: 20,
      windowMs: 60_000,
    });
  });

  it("uses guest policy rate key when unauthenticated", async () => {
    const request = new Request("http://localhost/api/upload/client", {
      method: "POST",
      body: JSON.stringify({ type: "blob.generate-client-token" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "upload:guest:ip:127.0.0.1:fp:none:10m",
      limit: 10,
      windowMs: 600000,
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockHandleUpload.mockRejectedValue(new Error("upload init fail"));
    const request = new Request("http://localhost/api/upload/client", {
      method: "POST",
      body: JSON.stringify({ type: "blob.generate-client-token" }),
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
