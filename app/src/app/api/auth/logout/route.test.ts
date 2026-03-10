import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/logout/route";
import { auth } from "@/lib/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { invalidateUserSessions } from "@/server/services/auth.service";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));

vi.mock("@/server/services/auth.service", () => ({
  invalidateUserSessions: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockInvalidateUserSessions = vi.mocked(invalidateUserSessions);

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockInvalidateUserSessions.mockReset();
  });

  it("revokes server sessions for the current user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    mockInvalidateUserSessions.mockResolvedValue(undefined);

    const response = await POST(new Request("http://localhost/api/auth/logout") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: true,
      data: {
        revoked: true,
      },
    });
    expect(mockInvalidateUserSessions).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("returns ok when no authenticated user exists", async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await POST(new Request("http://localhost/api/auth/logout") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        revoked: false,
      },
    });
    expect(mockInvalidateUserSessions).not.toHaveBeenCalled();
  });
});
