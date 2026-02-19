import { beforeEach, describe, expect, it, vi } from "vitest";
import { SanctionLevel } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getActiveInteractionSanction,
  issueNextUserSanction,
} from "@/server/services/sanction.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSanction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  userSanction: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

describe("sanction service", () => {
  beforeEach(() => {
    mockPrisma.userSanction.findFirst.mockReset();
    mockPrisma.userSanction.create.mockReset();
  });

  it("issues warning first when user has no sanction history", async () => {
    mockPrisma.userSanction.findFirst.mockResolvedValueOnce(null);
    mockPrisma.userSanction.create.mockResolvedValueOnce({
      id: "s1",
      userId: "u1",
      moderatorId: "m1",
      level: SanctionLevel.WARNING,
      reason: "test",
      sourceReportId: "r1",
      expiresAt: null,
      createdAt: new Date(),
    });

    const result = await issueNextUserSanction({
      userId: "u1",
      moderatorId: "m1",
      reason: "test",
      sourceReportId: "r1",
    });

    expect(mockPrisma.userSanction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          level: SanctionLevel.WARNING,
          expiresAt: null,
        }),
      }),
    );
    expect(result?.level).toBe(SanctionLevel.WARNING);
  });

  it("escalates to 7-day suspension after warning", async () => {
    mockPrisma.userSanction.findFirst.mockResolvedValueOnce({
      id: "s-prev",
      userId: "u1",
      moderatorId: "m1",
      level: SanctionLevel.WARNING,
      reason: "prev",
      sourceReportId: "r-prev",
      expiresAt: null,
      createdAt: new Date(),
    });
    mockPrisma.userSanction.create.mockResolvedValueOnce({
      id: "s-next",
      userId: "u1",
      moderatorId: "m1",
      level: SanctionLevel.SUSPEND_7D,
      reason: "next",
      sourceReportId: "r-next",
      expiresAt: new Date(),
      createdAt: new Date(),
    });

    const result = await issueNextUserSanction({
      userId: "u1",
      moderatorId: "m1",
      reason: "next",
      sourceReportId: "r-next",
    });

    expect(result?.level).toBe(SanctionLevel.SUSPEND_7D);
    expect(result?.expiresAt).not.toBeNull();
  });

  it("returns active suspension for interaction check", async () => {
    mockPrisma.userSanction.findFirst.mockResolvedValueOnce({
      id: "s-active",
      userId: "u1",
      moderatorId: "m1",
      level: SanctionLevel.SUSPEND_30D,
      reason: "active",
      sourceReportId: "r1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      createdAt: new Date(),
    });

    const result = await getActiveInteractionSanction("u1");

    expect(result?.level).toBe(SanctionLevel.SUSPEND_30D);
  });
});
