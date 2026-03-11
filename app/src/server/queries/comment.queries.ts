import { Prisma, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";

const NO_VIEWER_ID = "__NO_VIEWER__";
const DEFAULT_COMMENT_PAGE_LIMIT = 30;
const MAX_COMMENT_PAGE_LIMIT = 50;
const COMMENT_ORDER_BY = [{ createdAt: "asc" as const }, { id: "asc" as const }];

function isUnknownGuestAuthorIncludeError(error: unknown) {
  return error instanceof Error && error.message.includes("Unknown field `guestAuthor`");
}

const buildCommentSelect = (
  viewerId?: string,
  includeGuestAuthor = true,
  includeReactions = Boolean(viewerId),
) => ({
  id: true,
  postId: true,
  parentId: true,
  content: true,
  status: true,
  likeCount: true,
  dislikeCount: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  guestAuthorId: true,
  author: { select: { id: true, nickname: true, email: true } },
  ...(includeGuestAuthor
    ? {
        guestAuthor: {
          select: {
            id: true,
            displayName: true,
            ipDisplay: true,
            ipLabel: true,
          },
        },
      }
    : {}),
  ...(includeReactions
    ? {
        reactions: {
          where: {
            userId: viewerId ?? NO_VIEWER_ID,
          },
          select: { type: true },
        },
      }
    : {}),
});

function buildCommentWhere(
  postId: string,
  hiddenAuthorIds: string[],
  extraWhere?: Prisma.CommentWhereInput,
): Prisma.CommentWhereInput {
  return {
    postId,
    status: { in: [PostStatus.ACTIVE, PostStatus.DELETED] },
    ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
    ...extraWhere,
  };
}

async function findComments(
  args: Omit<Prisma.CommentFindManyArgs, "select">,
  viewerId?: string,
) {
  return prisma.comment
    .findMany({
      ...args,
      select: buildCommentSelect(viewerId, true, Boolean(viewerId)),
    })
    .catch(async (error) => {
      if (!isUnknownGuestAuthorIncludeError(error)) {
        throw error;
      }

      return prisma.comment.findMany({
        ...args,
        select: buildCommentSelect(viewerId, false, Boolean(viewerId)),
      });
    });
}

function normalizeCommentPageParam(value?: number) {
  if (!Number.isFinite(value) || !value) {
    return 1;
  }
  return Math.max(1, Math.trunc(value));
}

function normalizeCommentLimitParam(value?: number) {
  if (!Number.isFinite(value) || !value) {
    return DEFAULT_COMMENT_PAGE_LIMIT;
  }
  return Math.min(MAX_COMMENT_PAGE_LIMIT, Math.max(1, Math.trunc(value)));
}

function sortCommentsChronologically<T extends { createdAt: Date | string; id: string }>(comments: T[]) {
  return [...comments].sort((left, right) => {
    const leftTime = left.createdAt instanceof Date ? left.createdAt.getTime() : Date.parse(left.createdAt);
    const rightTime =
      right.createdAt instanceof Date ? right.createdAt.getTime() : Date.parse(right.createdAt);

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });
}

async function listCommentDescendants(
  postId: string,
  hiddenAuthorIds: string[],
  rootIds: string[],
  viewerId?: string,
) {
  if (rootIds.length === 0) {
    return [];
  }

  const descendants: Awaited<ReturnType<typeof findComments>> = [];
  const seen = new Set(rootIds);
  let frontier = rootIds;

  while (frontier.length > 0) {
    const batch = await findComments(
      {
        where: buildCommentWhere(postId, hiddenAuthorIds, {
          parentId: { in: frontier },
        }),
        orderBy: COMMENT_ORDER_BY,
      },
      viewerId,
    );

    const nextBatch = batch.filter((comment) => !seen.has(comment.id));
    if (nextBatch.length === 0) {
      break;
    }

    nextBatch.forEach((comment) => seen.add(comment.id));
    descendants.push(...nextBatch);
    frontier = nextBatch.map((comment) => comment.id);
  }

  return descendants;
}

export async function listComments(
  postId: string,
  viewerId?: string,
  options?: {
    page?: number;
    limit?: number;
  },
) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const requestedPage = normalizeCommentPageParam(options?.page);
  const limit = normalizeCommentLimitParam(options?.limit);

  const runListComments = async () => {
    const rootWhere = buildCommentWhere(postId, hiddenAuthorIds, {
      parentId: null,
    });
    const totalWhere = buildCommentWhere(postId, hiddenAuthorIds);

    const [totalRootCount, totalCount] = await Promise.all([
      prisma.comment.count({ where: rootWhere }),
      prisma.comment.count({ where: totalWhere }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalRootCount / limit));
    const page = Math.min(requestedPage, totalPages);
    const roots = await findComments(
      {
        where: rootWhere,
        orderBy: COMMENT_ORDER_BY,
        skip: (page - 1) * limit,
        take: limit,
      },
      viewerId,
    );
    const descendants = await listCommentDescendants(
      postId,
      hiddenAuthorIds,
      roots.map((comment) => comment.id),
      viewerId,
    );

    return {
      comments: sortCommentsChronologically([...roots, ...descendants]),
      totalCount,
      totalRootCount,
      page,
      totalPages,
      limit,
    };
  };

  const shouldCache = !viewerId && hiddenAuthorIds.length === 0;
  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-comments", { postId, page: requestedPage, limit });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runListComments,
    });
  }

  return runListComments();
}

export async function getCommentById(commentId: string) {
  return prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      postId: true,
      status: true,
      guestAuthorId: true,
      guestAuthor: {
        select: {
          id: true,
          passwordHash: true,
          ipHash: true,
          fingerprintHash: true,
          displayName: true,
        },
      },
    },
  });
}

export async function listCommentsByIds(commentIds: string[]) {
  if (commentIds.length === 0) {
    return [];
  }

  return prisma.comment.findMany({
    where: { id: { in: commentIds } },
    select: {
      id: true,
      postId: true,
      content: true,
      author: { select: { id: true, nickname: true } },
    },
  });
}

export async function countReplies(commentId: string) {
  return prisma.comment.count({
    where: { parentId: commentId, status: PostStatus.ACTIVE },
  });
}
