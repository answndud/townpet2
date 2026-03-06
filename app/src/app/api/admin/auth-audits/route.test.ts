import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/auth-audits/route";
import { requireModeratorUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listAuthAuditLogs } from "@/server/queries/auth-audit.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireModeratorUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/auth-audit.queries", () => ({
  AUTH_AUDIT_LOG_LIMIT_MAX: 200,
  listAuthAuditLogs: vi.fn(),
}));

const mockRequireModeratorUserId = vi.mocked(requireModeratorUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListAuthAuditLogs = vi.mocked(listAuthAuditLogs);

describe("GET /api/admin/auth-audits contract", () => {
  beforeEach(() => {
    mockRequireModeratorUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockListAuthAuditLogs.mockReset();
    mockRequireModeratorUserId.mockResolvedValue("admin-1");
    mockListAuthAuditLogs.mockResolvedValue([]);
  });

  it("returns invalid query for malformed limit", async () => {
    const request = new Request("http://localhost/api/admin/auth-audits?limit=0") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_QUERY" },
    });
  });

  it("maps auth service error", async () => {
    mockRequireModeratorUserId.mockRejectedValue(
      new ServiceError("auth", "AUTH_REQUIRED", 401),
    );
    const request = new Request("http://localhost/api/admin/auth-audits") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockListAuthAuditLogs.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/admin/auth-audits") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });

  it("returns login failures without linked user relation", async () => {
    mockListAuthAuditLogs.mockResolvedValue([
      {
        id: "audit-1",
        action: "LOGIN_FAILURE",
        userId: null,
        identifierLabel: "ab***@te***.dev",
        reasonCode: "USER_NOT_FOUND",
        user: null,
        ipAddress: "127.0.0.1",
        userAgent: "ua",
        createdAt: new Date("2026-03-05T00:00:00.000Z"),
      },
    ] as never);
    const request = new Request("http://localhost/api/admin/auth-audits") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: [
        {
          action: "LOGIN_FAILURE",
          userId: null,
          identifierLabel: "ab***@te***.dev",
          reasonCode: "USER_NOT_FOUND",
        },
      ],
    });
  });
});
