import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostScope, PostType } from "@prisma/client";

import {
  listBestPosts,
  listPostSearchSuggestions,
  listPosts,
} from "@/server/queries/post.queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
    },
    pet: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    findMany: ReturnType<typeof vi.fn>;
  };
  pet: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("post queries", () => {
  beforeEach(() => {
    mockPrisma.post.findMany.mockReset();
    mockPrisma.pet.findMany.mockReset();
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

  it("applies requested sorting to feed queries", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    await listPosts({
      limit: 20,
      scope: PostScope.GLOBAL,
      sort: "COMMENT",
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([
      { commentCount: "desc" },
      { likeCount: "desc" },
      { createdAt: "desc" },
    ]);
  });

  it("applies author search filter when searchIn is AUTHOR", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    await listPosts({
      limit: 20,
      scope: PostScope.GLOBAL,
      q: "alex",
      searchIn: "AUTHOR",
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.author).toEqual({
      OR: [
        { nickname: { contains: "alex", mode: "insensitive" } },
        { name: { contains: "alex", mode: "insensitive" } },
      ],
    });
    expect(args.where.OR).toBeUndefined();
  });

  it("applies full search filter when searchIn is ALL", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    await listPosts({
      limit: 20,
      scope: PostScope.GLOBAL,
      q: "산책",
      searchIn: "ALL",
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.OR).toHaveLength(3);
  });

  it("excludes configured post types for guest feeds", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    await listPosts({
      limit: 20,
      scope: PostScope.GLOBAL,
      excludeTypes: [PostType.HOSPITAL_REVIEW, PostType.MEETUP],
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.type).toEqual({
      notIn: [PostType.HOSPITAL_REVIEW, PostType.MEETUP],
    });
  });

  it("returns empty when requested type is excluded", async () => {
    const result = await listPosts({
      limit: 20,
      scope: PostScope.GLOBAL,
      type: PostType.HOSPITAL_REVIEW,
      excludeTypes: [PostType.HOSPITAL_REVIEW],
    });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
  });

  it("reorders feed with pet personalization when enabled", async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: "p1",
        author: { id: "a1" },
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        likeCount: 1,
        commentCount: 0,
        viewCount: 3,
      },
      {
        id: "p2",
        author: { id: "a2" },
        createdAt: new Date("2026-02-02T00:00:00.000Z"),
        likeCount: 2,
        commentCount: 1,
        viewCount: 10,
      },
      {
        id: "p3",
        author: { id: "a3" },
        createdAt: new Date("2026-02-03T00:00:00.000Z"),
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
      },
    ]);
    mockPrisma.pet.findMany
      .mockResolvedValueOnce([
        {
          userId: "viewer-1",
          species: "DOG",
          breedCode: "MALTESE",
          sizeClass: "SMALL",
        },
      ])
      .mockResolvedValueOnce([
        {
          userId: "a2",
          species: "DOG",
          breedCode: "MALTESE",
          sizeClass: "SMALL",
        },
      ]);

    const result = await listPosts({
      limit: 2,
      scope: PostScope.GLOBAL,
      personalized: true,
      viewerId: "viewer-1",
    });

    expect(mockPrisma.pet.findMany).toHaveBeenCalledTimes(2);
    expect(result.items[0]?.id).toBe("p2");
    expect(result.nextCursor).toBe("p3");
  });

  it("builds best feed with likes and recency ordering", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    await listBestPosts({
      limit: 5,
      days: 7,
      scope: PostScope.GLOBAL,
      minLikes: 2,
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.scope).toBe(PostScope.GLOBAL);
    expect(args.where.likeCount).toEqual({ gte: 2 });
    expect(args.where.neighborhoodId).toBeUndefined();
    expect(args.where.createdAt.gte).toBeInstanceOf(Date);
    expect(args.orderBy).toEqual([
      { likeCount: "desc" },
      { commentCount: "desc" },
      { viewCount: "desc" },
      { createdAt: "desc" },
    ]);
  });

  it("uses sentinel neighborhood for local best feed without primary neighborhood", async () => {
    mockPrisma.post.findMany.mockResolvedValue([]);

    await listBestPosts({
      limit: 10,
      days: 3,
      scope: PostScope.LOCAL,
    });

    const args = mockPrisma.post.findMany.mock.calls[0][0];
    expect(args.where.scope).toBe(PostScope.LOCAL);
    expect(args.where.neighborhoodId).toBe("__NO_NEIGHBORHOOD__");
    expect(args.where.likeCount).toEqual({ gte: 1 });
  });

  it("builds search suggestions with unique matching values", async () => {
    mockPrisma.post.findMany.mockResolvedValue([
      {
        title: "강남 산책 코스 추천",
        author: { nickname: "강남견주", name: "Alex" },
      },
      {
        title: "주말 산책 후기",
        author: { nickname: "산책러버", name: "Kim" },
      },
    ]);

    const items = await listPostSearchSuggestions({
      q: "산책",
      limit: 5,
      scope: PostScope.GLOBAL,
      searchIn: "ALL",
    });

    expect(items).toEqual(["강남 산책 코스 추천", "주말 산책 후기", "산책러버"]);
  });
});
