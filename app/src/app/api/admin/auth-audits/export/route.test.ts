import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthAuditAction } from "@prisma/client";

import { GET } from "@/app/api/admin/auth-audits/export/route";
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

describe("GET /api/admin/auth-audits/export contract", () => {
  beforeEach(() => {
    mockRequireModeratorUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockListAuthAuditLogs.mockReset();
    mockRequireModeratorUserId.mockResolvedValue("admin-1");
    mockListAuthAuditLogs.mockResolvedValue([
      {
        action: AuthAuditAction.PASSWORD_SET,
        userId: "user-1",
        user: {
          id: "user-1",
          email: "u1@test.dev",
          nickname: "nick-1",
          name: "User One",
        },
        ipAddress: "127.0.0.1",
        userAgent: "ua",
        createdAt: new Date("2026-03-04T00:00:00.000Z"),
      },
    ] as never);
  });

  it("returns csv file for valid request", async () => {
    const request = new Request("http://localhost/api/admin/auth-audits/export") as NextRequest;

    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(text).toContain("action,userId,email,nickname,ipAddress,userAgent,createdAt");
    expect(text).toContain("PASSWORD_SET");
    expect(text).toContain("u1@test.dev");
  });

  it("maps auth service error", async () => {
    mockRequireModeratorUserId.mockRejectedValue(
      new ServiceError("forbidden", "FORBIDDEN", 403),
    );
    const request = new Request("http://localhost/api/admin/auth-audits/export") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockListAuthAuditLogs.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/admin/auth-audits/export") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
