import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostStatus } from "@prisma/client";

import { BEST_COMMENT_MIN_LIKES, MAX_BEST_COMMENTS } from "@/lib/comment-ranking";
import { prisma } from "@/lib/prisma";
import { listComments } from "@/server/queries/comment.queries";
import { listHiddenAuthorGroupsForViewer } from "@/server/queries/user-relation.queries";

vi.mock("@/server/cache/query-cache", async () => {
  const actual = await vi.importActual<typeof import("@/server/cache/query-cache")>(
    "@/server/cache/query-cache",
  );

  return {
    ...actual,
    createQueryCacheKey: vi.fn(async () => "cache:post-comments"),
    withQueryCache: vi.fn(async ({ fetcher }: { fetcher: () => Promise<unknown> }) => fetcher()),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/queries/user-relation.queries", () => ({
  listHiddenAuthorGroupsForViewer: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  comment: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mockListHiddenAuthorGroupsForViewer = vi.mocked(listHiddenAuthorGroupsForViewer);

function buildComment(
  id: string,
  overrides?: Partial<{
    postId: string;
    parentId: string | null;
    content: string;
    status: PostStatus;
    likeCount: number;
    dislikeCount: number;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    guestAuthorId: string | null;
    reactions: Array<{ type: "LIKE" | "DISLIKE" }>;
  }>,
) {
  const createdAt = overrides?.createdAt ?? new Date("2026-03-11T09:00:00Z");
  return {
    id,
    postId: overrides?.postId ?? "post-1",
    parentId: overrides?.parentId ?? null,
    content: overrides?.content ?? `${id} content`,
    status: overrides?.status ?? PostStatus.ACTIVE,
    likeCount: overrides?.likeCount ?? 0,
    dislikeCount: overrides?.dislikeCount ?? 0,
    createdAt,
    updatedAt: overrides?.updatedAt ?? createdAt,
    authorId: overrides?.authorId ?? `author-${id}`,
    guestAuthorId: overrides?.guestAuthorId ?? null,
    author: {
      id: overrides?.authorId ?? `author-${id}`,
      nickname: `${id}-nickname`,
      email: `${id}@townpet.dev`,
    },
    reactions: overrides?.reactions ?? [],
  };
}

describe("comment queries", () => {
  beforeEach(() => {
    mockPrisma.comment.count.mockReset();
    mockPrisma.comment.findMany.mockReset();
    mockListHiddenAuthorGroupsForViewer.mockReset();
    mockListHiddenAuthorGroupsForViewer.mockResolvedValue({
      blockedAuthorIds: [],
      mutedAuthorIds: [],
      hiddenAuthorIds: [],
    });
  });

  it("returns latest root comments by page and exposes best comments above the threshold", async () => {
    const rootFive = buildComment("root-5", {
      createdAt: new Date("2026-03-11T13:00:00Z"),
    });
    const rootFour = buildComment("root-4", {
      createdAt: new Date("2026-03-11T12:00:00Z"),
    });
    const rootThree = buildComment("root-3", {
      createdAt: new Date("2026-03-11T11:00:00Z"),
      likeCount: 17,
    });
    const rootTwo = buildComment("root-2", {
      createdAt: new Date("2026-03-11T10:00:00Z"),
      likeCount: 31,
    });
    const rootOne = buildComment("root-1", {
      createdAt: new Date("2026-03-11T09:00:00Z"),
      likeCount: 45,
    });
    const replyBest = buildComment("reply-best", {
      parentId: "root-4",
      likeCount: 10,
      createdAt: new Date("2026-03-11T12:05:00Z"),
    });
    const rootNodes = [rootFive, rootFour, rootThree, rootTwo, rootOne];
    const bestComments = [rootOne, rootTwo, rootThree, replyBest];

    mockPrisma.comment.count.mockImplementation(async ({ where }) => {
      if (where.parentId === null && !where.OR) {
        return 5 as never;
      }

      if (where.parentId === null && Array.isArray(where.OR)) {
        const targetDate = where.OR[1]?.createdAt as Date | undefined;
        const targetId = where.OR[1]?.id?.gt as string | undefined;
        const newerCount = rootNodes.filter((root) => {
          const createdAt = root.createdAt as Date;
          if (!targetDate || !targetId) {
            return false;
          }
          return createdAt > targetDate || (createdAt.getTime() === targetDate.getTime() && root.id > targetId);
        }).length;
        return newerCount as never;
      }

      return 7 as never;
    });

    mockPrisma.comment.findMany.mockImplementation(async ({ where, orderBy, skip, take }) => {
      if (Array.isArray(orderBy) && orderBy[0]?.likeCount === "desc") {
        expect(where).toEqual(
          expect.objectContaining({
            postId: "post-1",
            status: PostStatus.ACTIVE,
            likeCount: { gte: BEST_COMMENT_MIN_LIKES },
          }),
        );
        expect(take).toBe(MAX_BEST_COMMENTS);
        return bestComments as never;
      }

      if (where.parentId === null) {
        expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
        expect(skip).toBe(2);
        expect(take).toBe(2);
        return [rootThree, rootTwo] as never;
      }

      if (where.id?.in?.includes("root-4")) {
        return [
          {
            id: "root-4",
            parentId: null,
            createdAt: rootFour.createdAt,
          },
        ] as never;
      }

      if (where.parentId?.in?.includes("root-3") || where.parentId?.in?.includes("root-2")) {
        return [] as never;
      }

      return [] as never;
    });

    const result = await listComments("post-1", "viewer-1", { page: 2, limit: 2 });

    expect(result.bestComments.map((comment) => comment.id)).toEqual([
      "root-1",
      "root-2",
      "root-3",
      "reply-best",
    ]);
    expect(result.comments.filter((comment) => comment.parentId === null).map((comment) => comment.id)).toEqual([
      "root-3",
      "root-2",
    ]);
    expect(result.bestComments.map((comment) => [comment.id, comment.threadRootId, comment.threadPage])).toEqual([
      ["root-1", "root-1", 3],
      ["root-2", "root-2", 2],
      ["root-3", "root-3", 2],
      ["reply-best", "root-4", 1],
    ]);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(mockListHiddenAuthorGroupsForViewer).toHaveBeenCalledWith("viewer-1");
  });

  it("keeps muted comments in the thread as placeholders while still hiding blocked authors", async () => {
    const visibleRoot = buildComment("visible-root", {
      authorId: "visible-author",
      likeCount: 18,
      createdAt: new Date("2026-03-11T13:00:00Z"),
    });
    const mutedRoot = buildComment("muted-root", {
      authorId: "muted-author",
      content: "숨겨져야 하는 원문",
      likeCount: 24,
      createdAt: new Date("2026-03-11T12:00:00Z"),
    });

    mockListHiddenAuthorGroupsForViewer.mockResolvedValue({
      blockedAuthorIds: ["blocked-author"],
      mutedAuthorIds: ["muted-author"],
      hiddenAuthorIds: ["blocked-author", "muted-author"],
    });

    mockPrisma.comment.count.mockImplementation(async ({ where }) => {
      expect(where.authorId).toEqual({ notIn: ["blocked-author"] });
      return 2 as never;
    });

    mockPrisma.comment.findMany.mockImplementation(async ({ where, orderBy, skip, take }) => {
      if (Array.isArray(orderBy) && orderBy[0]?.likeCount === "desc") {
        expect(where).toEqual(
          expect.objectContaining({
            postId: "post-1",
            status: PostStatus.ACTIVE,
            likeCount: { gte: BEST_COMMENT_MIN_LIKES },
            authorId: { notIn: ["blocked-author"] },
          }),
        );
        return [mutedRoot, visibleRoot] as never;
      }

      if (where.parentId === null) {
        expect(skip).toBe(0);
        expect(take).toBe(30);
        expect(where.authorId).toEqual({ notIn: ["blocked-author"] });
        return [visibleRoot, mutedRoot] as never;
      }

      return [] as never;
    });

    const result = await listComments("post-1", "viewer-1");

    expect(result.bestComments.map((comment) => [comment.id, comment.isMutedByViewer, comment.content])).toEqual([
      ["muted-root", true, "뮤트한 사용자 댓글입니다."],
      ["visible-root", undefined, "visible-root content"],
    ]);
    expect(result.comments.map((comment) => [comment.id, comment.isMutedByViewer, comment.content])).toEqual([
      ["visible-root", undefined, "visible-root content"],
      ["muted-root", true, "뮤트한 사용자 댓글입니다."],
    ]);
    expect(result.bestComments[0]?.author.nickname).toBe("뮤트한 사용자");
    expect(result.comments[1]?.author.nickname).toBe("뮤트한 사용자");
  });
});
