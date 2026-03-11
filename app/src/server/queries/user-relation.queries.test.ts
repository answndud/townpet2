import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  listHiddenAuthorGroupsForViewer,
  listHiddenAuthorIdsForViewer,
} from "@/server/queries/user-relation.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userBlock: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    userMute: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  userBlock: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  userMute: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe("user relation queries", () => {
  beforeEach(() => {
    mockPrisma.userBlock.findMany.mockReset();
    mockPrisma.userBlock.findFirst.mockReset();
    mockPrisma.userMute.findMany.mockReset();
    mockPrisma.userMute.findFirst.mockReset();

    mockPrisma.userBlock.findMany.mockResolvedValue([]);
    mockPrisma.userMute.findMany.mockResolvedValue([]);
  });

  it("reflects mute changes immediately without stale hidden-author cache", async () => {
    mockPrisma.userMute.findMany
      .mockResolvedValueOnce([{ mutedUserId: "author-1" }])
      .mockResolvedValueOnce([]);

    const first = await listHiddenAuthorIdsForViewer("viewer-1");
    const second = await listHiddenAuthorIdsForViewer("viewer-1");

    expect(first).toEqual(["author-1"]);
    expect(second).toEqual([]);
    expect(mockPrisma.userMute.findMany).toHaveBeenCalledTimes(2);
  });

  it("separates blocked and muted author ids for comment visibility policies", async () => {
    mockPrisma.userBlock.findMany.mockResolvedValue([
      {
        blockerId: "viewer-1",
        blockedId: "blocked-1",
      },
    ]);
    mockPrisma.userMute.findMany.mockResolvedValue([
      {
        mutedUserId: "muted-1",
      },
    ]);

    await expect(listHiddenAuthorGroupsForViewer("viewer-1")).resolves.toEqual({
      blockedAuthorIds: ["blocked-1"],
      mutedAuthorIds: ["muted-1"],
      hiddenAuthorIds: expect.arrayContaining(["blocked-1", "muted-1"]),
    });
  });
});
