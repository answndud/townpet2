import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/viewer-shell/route";
import { auth } from "@/lib/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { countUnreadNotifications } from "@/server/queries/notification.queries";
import { getUserById } from "@/server/queries/user.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/notification.queries", () => ({
  countUnreadNotifications: vi.fn(),
}));
vi.mock("@/server/queries/user.queries", () => ({
  getUserById: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockCountUnreadNotifications = vi.mocked(countUnreadNotifications);
const mockGetUserById = vi.mocked(getUserById);

describe("GET /api/viewer-shell contract", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockCountUnreadNotifications.mockReset();
    mockGetUserById.mockReset();
  });

  it("returns guest shell when session is absent", async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        isAuthenticated: false,
        canModerate: false,
        unreadNotificationCount: 0,
        preferredPetTypeIds: [],
      },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns authenticated shell metadata", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "user-1",
      role: UserRole.MODERATOR,
      preferredPetTypes: [{ petTypeId: "pet-1" }, { petTypeId: "pet-2" }],
    } as never);
    mockCountUnreadNotifications.mockResolvedValue(4);

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        isAuthenticated: true,
        canModerate: true,
        unreadNotificationCount: 4,
        preferredPetTypeIds: ["pet-1", "pet-2"],
      },
    });
  });

  it("falls back to guest shell when auth lookup fails", async () => {
    mockAuth.mockRejectedValue(new Error("boom"));

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        isAuthenticated: false,
        canModerate: false,
        unreadNotificationCount: 0,
        preferredPetTypeIds: [],
      },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("surfaces notification schema sync errors for authenticated shell", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      preferredPetTypes: [],
    } as never);
    mockCountUnreadNotifications.mockRejectedValue(
      new ServiceError("schema sync required", "SCHEMA_SYNC_REQUIRED", 503),
    );

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "SCHEMA_SYNC_REQUIRED",
        message: "schema sync required",
      },
    });
  });
});
