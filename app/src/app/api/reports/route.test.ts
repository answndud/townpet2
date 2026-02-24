import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/reports/route";
import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { createReport } from "@/server/services/report.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/report.service", () => ({ createReport: vi.fn() }));

const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockCreateReport = vi.mocked(createReport);

describe("POST /api/reports contract", () => {
  beforeEach(() => {
    mockRequireCurrentUser.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockEnforceRateLimit.mockReset();
    mockCreateReport.mockReset();
  });

  it("maps auth service error to 401", async () => {
    mockRequireCurrentUser.mockRejectedValue(
      new ServiceError("login", "AUTH_REQUIRED", 401),
    );
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "POST", targetId: "p1", reason: "SPAM" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("maps duplicate report error to 409", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockEnforceRateLimit.mockResolvedValue();
    mockCreateReport.mockRejectedValue(
      new ServiceError("dup", "DUPLICATE_REPORT", 409),
    );
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "POST", targetId: "p1", reason: "SPAM" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_REPORT" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockEnforceRateLimit.mockRejectedValue(new Error("redis down"));
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "POST", targetId: "p1", reason: "SPAM" }),
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
