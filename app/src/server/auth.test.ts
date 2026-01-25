import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import { ServiceError } from "@/server/services/service-error";
import { getCurrentUser, requireCurrentUser, requireModerator } from "@/server/auth";
import { auth } from "@/lib/auth";
import { getUserByEmail, getUserById } from "@/server/queries/user.queries";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/queries/user.queries", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockGetUserByEmail = vi.mocked(getUserByEmail);
const mockGetUserById = vi.mocked(getUserById);

describe("auth helpers", () => {
  const demoEmail = "demo@townpet.dev";

  beforeEach(() => {
    mockAuth.mockReset();
    mockGetUserByEmail.mockReset();
    mockGetUserById.mockReset();
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
      role: UserRole.USER,
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe("user-1");
    expect(mockGetUserById).toHaveBeenCalledWith("user-1");
    expect(mockGetUserByEmail).not.toHaveBeenCalled();
  });

  it("falls back to demo user when no session", async () => {
    process.env.DEMO_USER_EMAIL = demoEmail;
    mockAuth.mockResolvedValue(null);
    mockGetUserByEmail.mockResolvedValue({
      id: "demo-1",
      email: demoEmail,
      name: "Demo",
      nickname: "demo",
      role: UserRole.USER,
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe("demo-1");
    expect(mockGetUserByEmail).toHaveBeenCalledWith(demoEmail);
  });

  it("requireCurrentUser throws when missing", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireCurrentUser()).rejects.toBeInstanceOf(ServiceError);
  });

  it("requireModerator allows admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "admin-1",
      email: "admin@townpet.dev",
      name: "Admin",
      nickname: "admin",
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
      role: UserRole.USER,
    });

    await expect(requireModerator()).rejects.toBeInstanceOf(ServiceError);
  });
});
