import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { ServiceError } from "@/server/services/service-error";
import {
  getCurrentUser,
  getCurrentUserId,
  getCurrentUserRole,
  requireAuthenticatedUserId,
  requireCurrentUser,
  requireModerator,
  requireModeratorUserId,
} from "@/server/auth";
import { auth } from "@/lib/auth";
import {
  getUserByEmail,
  getUserById,
  getUserRoleByEmail,
  getUserRoleById,
} from "@/server/queries/user.queries";
import { getActiveInteractionSanction } from "@/server/services/sanction.service";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/queries/user.queries", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  getUserRoleByEmail: vi.fn(),
  getUserRoleById: vi.fn(),
}));

vi.mock("@/server/services/sanction.service", () => ({
  getActiveInteractionSanction: vi.fn(),
  formatSanctionLevelLabel: vi.fn().mockReturnValue("7일 정지"),
}));

const mockAuth = vi.mocked(auth);
const mockGetUserByEmail = vi.mocked(getUserByEmail);
const mockGetUserById = vi.mocked(getUserById);
const mockGetUserRoleByEmail = vi.mocked(getUserRoleByEmail);
const mockGetUserRoleById = vi.mocked(getUserRoleById);
const mockGetActiveInteractionSanction = vi.mocked(getActiveInteractionSanction);

describe("auth helpers", () => {
  const demoEmail = "demo@townpet.dev";

  beforeEach(() => {
    mockAuth.mockReset();
    mockGetUserByEmail.mockReset();
    mockGetUserById.mockReset();
    mockGetUserRoleByEmail.mockReset();
    mockGetUserRoleById.mockReset();
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

  it("returns current user id from session without user DB read", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-id-only" } } as never);

    const userId = await getCurrentUserId();

    expect(userId).toBe("user-id-only");
    expect(mockGetUserById).not.toHaveBeenCalled();
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

  it("falls back to demo user id when no session", async () => {
    process.env.DEMO_USER_EMAIL = demoEmail;
    mockAuth.mockResolvedValue(null as never);
    mockGetUserByEmail.mockResolvedValue({
      id: "demo-id-only",
      email: demoEmail,
      name: "Demo",
      nickname: "demo",
      bio: null,
      image: null,
      role: UserRole.USER,
    });

    const userId = await getCurrentUserId();

    expect(userId).toBe("demo-id-only");
    expect(mockGetUserByEmail).toHaveBeenCalledWith(demoEmail);
  });

  it("does not use demo fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DEMO_USER_EMAIL = demoEmail;
    mockAuth.mockResolvedValue(null as never);

    try {
      const user = await getCurrentUser();

      expect(user).toBeNull();
      expect(mockGetUserByEmail).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not use demo id fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DEMO_USER_EMAIL = demoEmail;
    mockAuth.mockResolvedValue(null as never);

    try {
      const userId = await getCurrentUserId();

      expect(userId).toBeNull();
      expect(mockGetUserByEmail).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("requireCurrentUser throws when missing", async () => {
    mockAuth.mockResolvedValue(null as never);

    await expect(requireCurrentUser()).rejects.toBeInstanceOf(ServiceError);
  });

  it("requireAuthenticatedUserId throws when missing", async () => {
    mockAuth.mockResolvedValue(null as never);

    await expect(requireAuthenticatedUserId()).rejects.toBeInstanceOf(ServiceError);
  });

  it("requireAuthenticatedUserId returns session id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-auth-id" } } as never);

    await expect(requireAuthenticatedUserId()).resolves.toBe("user-auth-id");
  });

  it("returns current user role summary from session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-role-1" } } as never);
    mockGetUserRoleById.mockResolvedValue({
      id: "user-role-1",
      role: UserRole.MODERATOR,
    });

    const userRole = await getCurrentUserRole();

    expect(userRole).toEqual({
      id: "user-role-1",
      role: UserRole.MODERATOR,
    });
    expect(mockGetUserRoleById).toHaveBeenCalledWith("user-role-1");
  });

  it("requireModeratorUserId returns id for moderator", async () => {
    mockAuth.mockResolvedValue({ user: { id: "mod-1" } } as never);
    mockGetUserRoleById.mockResolvedValue({
      id: "mod-1",
      role: UserRole.MODERATOR,
    });

    await expect(requireModeratorUserId()).resolves.toBe("mod-1");
  });

  it("requireModeratorUserId throws forbidden for normal user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-9" } } as never);
    mockGetUserRoleById.mockResolvedValue({
      id: "user-9",
      role: UserRole.USER,
    });

    await expect(requireModeratorUserId()).rejects.toBeInstanceOf(ServiceError);
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
