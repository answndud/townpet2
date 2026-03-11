import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommonBoardType } from "@prisma/client";

import {
  countAdoptionBoardPosts,
  listAdoptionBoardPostsPage,
  listCommonBoardPosts,
} from "@/server/queries/community.queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    userBlock: {
      findMany: vi.fn(),
    },
    userMute: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  userBlock: {
    findMany: ReturnType<typeof vi.fn>;
  };
  userMute: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("community queries", () => {
  beforeEach(() => {
    mockPrisma.post.count.mockReset();
    mockPrisma.post.findMany.mockReset();
    mockPrisma.userBlock.findMany.mockReset();
    mockPrisma.userMute.findMany.mockReset();
    mockPrisma.post.count.mockResolvedValue(0);
    mockPrisma.post.findMany.mockResolvedValue([]);
    mockPrisma.userBlock.findMany.mockResolvedValue([]);
    mockPrisma.userMute.findMany.mockResolvedValue([]);
  });

  it("filters hidden authors and structured hospital fields in common board queries", async () => {
    mockPrisma.userBlock.findMany.mockResolvedValue([
      { blockerId: "viewer-1", blockedId: "blocked-1" },
    ]);

    await listCommonBoardPosts({
      limit: 20,
      commonBoardType: CommonBoardType.HOSPITAL,
      q: "중성화",
      viewerId: "viewer-1",
    });

    const countArgs = mockPrisma.post.count.mock.calls[0][0];
    const listArgs = mockPrisma.post.findMany.mock.calls[0][0];
    expect(countArgs.where.authorId).toEqual({ notIn: ["blocked-1"] });
    expect(countArgs.where.author).toEqual(
      expect.objectContaining({
        sanctionsReceived: expect.objectContaining({
          none: expect.any(Object),
        }),
      }),
    );
    expect(countArgs.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hospitalReview: {
            is: {
              OR: expect.arrayContaining([
                expect.objectContaining({
                  treatmentType: { contains: "중성화 수술", mode: "insensitive" },
                }),
              ]),
            },
          },
        }),
      ]),
    );
    expect(listArgs.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("applies hidden author filtering and stable ordering to adoption board page queries", async () => {
    mockPrisma.userMute.findMany.mockResolvedValue([{ mutedUserId: "muted-1" }]);

    await listAdoptionBoardPostsPage({
      page: 1,
      limit: 12,
      q: "코기",
      viewerId: "viewer-2",
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.authorId).toEqual({ notIn: ["muted-1"] });
    expect(args.where.author).toEqual(
      expect.objectContaining({
        sanctionsReceived: expect.objectContaining({
          none: expect.any(Object),
        }),
      }),
    );
    expect(args.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adoptionListing: {
            is: {
              OR: expect.arrayContaining([
                expect.objectContaining({
                  breed: { contains: "웰시코기", mode: "insensitive" },
                }),
              ]),
            },
          },
        }),
      ]),
    );
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
  });

  it("keeps blocked authors out of adoption board counts", async () => {
    mockPrisma.userBlock.findMany.mockResolvedValue([
      { blockerId: "viewer-3", blockedId: "blocked-3" },
    ]);

    await countAdoptionBoardPosts({
      q: "보호소",
      viewerId: "viewer-3",
    });

    const args = mockPrisma.post.count.mock.calls[0][0];
    expect(args.where.authorId).toEqual({ notIn: ["blocked-3"] });
    expect(args.where.author).toEqual(
      expect.objectContaining({
        sanctionsReceived: expect.objectContaining({
          none: expect.any(Object),
        }),
      }),
    );
  });
});
