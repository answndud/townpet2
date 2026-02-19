import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { ServiceError } from "@/server/services/service-error";
import { getCurrentUser, requireCurrentUser, requireModerator } from "@/server/auth";
import { auth } from "@/lib/auth";
import { getUserByEmail, getUserById } from "@/server/queries/user.queries";
import { getActiveInteractionSanction } from "@/server/services/sanction.service";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/queries/user.queries", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("@/server/services/sanction.service", () => ({
  getActiveInteractionSanction: vi.fn(),
  formatSanctionLevelLabel: vi.fn().mockReturnValue("7일 정지"),
}));

const mockAuth = vi.mocked(auth);
const mockGetUserByEmail = vi.mocked(getUserByEmail);
const mockGetUserById = vi.mocked(getUserById);
const mockGetActiveInteractionSanction = vi.mocked(getActiveInteractionSanction);

describe("auth helpers", () => {
  const demoEmail = "demo@townpet.dev";

  beforeEach(() => {
    mockAuth.mockReset();
    mockGetUserByEmail.mockReset();
    mockGetUserById.mockReset();
    mockGetActiveInteractionSanction.mockReset();
    mockGetActiveInteractionSanction.mockResolvedValue(null);
    delete process.env.DEMO_USER_EMAIL;
  });

  afterEach(() => {
    delete process.env.DEMO_USER_EMAIL;
  });

  it("returns current user from session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "user-1",
      email: "user@townpet.dev",
      name: null,
      nickname: null,
      bio: null,
      image: null,
      role: UserRole.USER,
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe("user-1");
    expect(mockGetUserById).toHaveBeenCalledWith("user-1");
    expect(mockGetUserByEmail).not.toHaveBeenCalled();
  });

  it("falls back to demo user when no session", async () => {
    process.env.DEMO_USER_EMAIL = demoEmail;
    mockAuth.mockResolvedValue(null as never);
    mockGetUserByEmail.mockResolvedValue({
      id: "demo-1",
      email: demoEmail,
      name: "Demo",
      nickname: "demo",
      bio: null,
      image: null,
      role: UserRole.USER,
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe("demo-1");
    expect(mockGetUserByEmail).toHaveBeenCalledWith(demoEmail);
  });

  it("requireCurrentUser throws when missing", async () => {
    mockAuth.mockResolvedValue(null as never);

    await expect(requireCurrentUser()).rejects.toBeInstanceOf(ServiceError);
  });

  it("requireModerator allows admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "admin-1",
      email: "admin@townpet.dev",
      name: "Admin",
      nickname: "admin",
      bio: null,
      image: null,
      role: UserRole.ADMIN,
    });

    const user = await requireModerator();

    expect(user.id).toBe("admin-1");
  });

  it("requireModerator rejects normal user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "user-2",
      email: "user2@townpet.dev",
      name: "User",
      nickname: "user",
      bio: null,
      image: null,
      role: UserRole.USER,
    });

    await expect(requireModerator()).rejects.toBeInstanceOf(ServiceError);
  });

  it("requireCurrentUser rejects suspended user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-3" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "user-3",
      email: "user3@townpet.dev",
      name: "User3",
      nickname: "user3",
      bio: null,
      image: null,
      role: UserRole.USER,
    });
    mockGetActiveInteractionSanction.mockResolvedValue({
      id: "sanction-1",
      userId: "user-3",
      moderatorId: "mod-1",
      level: "SUSPEND_7D",
      reason: "테스트 제재",
      sourceReportId: "report-1",
      expiresAt: new Date("2026-03-01T00:00:00.000Z"),
      createdAt: new Date("2026-02-19T00:00:00.000Z"),
    } as never);

    await expect(requireCurrentUser()).rejects.toBeInstanceOf(ServiceError);
  });
});
