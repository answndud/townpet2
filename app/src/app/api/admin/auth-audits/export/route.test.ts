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
        identifierLabel: "u1***@te***.dev",
        reasonCode: null,
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
    expect(text).toContain("action,reasonCode,userId,identifierLabel,email,nickname,ipAddress,userAgent,createdAt");
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

  it("neutralizes spreadsheet formulas in csv export", async () => {
    mockListAuthAuditLogs.mockResolvedValue([
      {
        action: AuthAuditAction.PASSWORD_SET,
        userId: "user-1",
        identifierLabel: "=evil@example.dev",
        reasonCode: null,
        user: {
          id: "user-1",
          email: "=cmd|' /C calc'!A0",
          nickname: "+nickname",
          name: "User One",
        },
        ipAddress: "127.0.0.1",
        userAgent: "@evil-agent",
        createdAt: new Date("2026-03-04T00:00:00.000Z"),
      },
    ] as never);

    const request = new Request("http://localhost/api/admin/auth-audits/export") as NextRequest;

    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("\"'=cmd|' /C calc'!A0\"");
    expect(text).toContain("\"'+nickname\"");
    expect(text).toContain("\"'=evil@example.dev\"");
    expect(text).toContain("\"'@evil-agent\"");
  });

  it("exports login failures without linked user relation", async () => {
    mockListAuthAuditLogs.mockResolvedValue([
      {
        action: AuthAuditAction.LOGIN_FAILURE,
        userId: null,
        identifierLabel: "ab***@te***.dev",
        reasonCode: "USER_NOT_FOUND",
        user: null,
        ipAddress: "127.0.0.1",
        userAgent: "ua",
        createdAt: new Date("2026-03-04T00:00:00.000Z"),
      },
    ] as never);

    const request = new Request("http://localhost/api/admin/auth-audits/export") as NextRequest;

    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("LOGIN_FAILURE");
    expect(text).toContain("USER_NOT_FOUND");
    expect(text).toContain("ab***@te***.dev");
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
