import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostScope } from "@prisma/client";

import { listPosts } from "@/server/queries/post.queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("post queries", () => {
  beforeEach(() => {
    mockPrisma.post.findMany.mockReset();
  });

  it("filters local feed by primary neighborhood", async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      { id: "p1" },
      { id: "p2" },
      { id: "p3" },
    ]);

    const result = await listPosts({
      limit: 2,
      scope: PostScope.LOCAL,
      neighborhoodId: "neighborhood-1",
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.scope).toBe(PostScope.LOCAL);
    expect(args.where.neighborhoodId).toBe("neighborhood-1");
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("p3");
  });

  it("returns empty local feed when neighborhood is missing", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    await listPosts({
      limit: 20,
      scope: PostScope.LOCAL,
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.scope).toBe(PostScope.LOCAL);
    expect(args.where.neighborhoodId).toBe("__NO_NEIGHBORHOOD__");
  });

  it("does not apply neighborhood filter to global feed", async () => {
    mockPrisma.post.findMany.mockResolvedValue([{ id: "g1" }]);

    await listPosts({
      limit: 20,
      scope: PostScope.GLOBAL,
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.scope).toBe(PostScope.GLOBAL);
    expect(args.where.neighborhoodId).toBeUndefined();
  });
});
