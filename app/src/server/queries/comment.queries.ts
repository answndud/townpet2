import { Prisma, PostStatus } from "@prisma/client";

import { BEST_COMMENT_MIN_LIKES, MAX_BEST_COMMENTS } from "@/lib/comment-ranking";
import { prisma } from "@/lib/prisma";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { listHiddenAuthorGroupsForViewer } from "@/server/queries/user-relation.queries";

const NO_VIEWER_ID = "__NO_VIEWER__";
const DEFAULT_COMMENT_PAGE_LIMIT = 30;
const MAX_COMMENT_PAGE_LIMIT = 50;
const ROOT_COMMENT_ORDER_BY = [{ createdAt: "desc" as const }, { id: "desc" as const }];
const COMMENT_ORDER_BY = [{ createdAt: "asc" as const }, { id: "asc" as const }];
const BEST_COMMENT_ORDER_BY = [
  { likeCount: "desc" as const },
  { createdAt: "desc" as const },
  { id: "desc" as const },
];
const MUTED_COMMENT_PLACEHOLDER_CONTENT = "뮤트한 사용자 댓글입니다.";
const MUTED_COMMENT_PLACEHOLDER_NAME = "뮤트한 사용자";

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

type CommentListItem = Awaited<ReturnType<typeof findComments>>[number] & {
  isMutedByViewer?: boolean;
};

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

async function findCommentThreadNodes(
  postId: string,
  hiddenAuthorIds: string[],
  commentIds: string[],
) {
  if (commentIds.length === 0) {
    return [];
  }

  return prisma.comment.findMany({
    where: buildCommentWhere(postId, hiddenAuthorIds, {
      id: {
        in: commentIds,
      },
    }),
    select: {
      id: true,
      parentId: true,
      createdAt: true,
    },
  });
}

async function listBestComments(
  postId: string,
  excludedAuthorIds: string[],
  viewerId?: string,
) {
  return findComments(
    {
      where: buildCommentWhere(postId, excludedAuthorIds, {
        status: PostStatus.ACTIVE,
        likeCount: {
          gte: BEST_COMMENT_MIN_LIKES,
        },
      }),
      orderBy: BEST_COMMENT_ORDER_BY,
      take: MAX_BEST_COMMENTS,
    },
    viewerId,
  );
}

function applyMutedCommentPlaceholders<T extends CommentListItem>(
  comments: T[],
  mutedAuthorIds: string[],
): Array<T & { isMutedByViewer?: boolean }> {
  if (mutedAuthorIds.length === 0) {
    return comments;
  }

  const mutedAuthorIdSet = new Set(mutedAuthorIds);

  return comments.map((comment) => {
    if (comment.status !== PostStatus.ACTIVE || !mutedAuthorIdSet.has(comment.authorId)) {
      return comment;
    }

    return {
      ...comment,
      content: MUTED_COMMENT_PLACEHOLDER_CONTENT,
      reactions: [],
      author: {
        ...comment.author,
        nickname: MUTED_COMMENT_PLACEHOLDER_NAME,
      },
      isMutedByViewer: true,
    };
  });
}

async function attachBestCommentThreadContext<
  T extends {
    id: string;
    parentId: string | null;
    createdAt: Date | string;
  },
>(
  postId: string,
  hiddenAuthorIds: string[],
  bestComments: T[],
  limit: number,
) {
  if (bestComments.length === 0) {
    return [];
  }

  const nodeMap = new Map(
    bestComments.map((comment) => [
      comment.id,
      {
        id: comment.id,
        parentId: comment.parentId,
        createdAt: comment.createdAt instanceof Date ? comment.createdAt : new Date(comment.createdAt),
      },
    ]),
  );

  let frontier = [...new Set(bestComments.map((comment) => comment.parentId).filter(Boolean) as string[])];

  while (frontier.length > 0) {
    const fetchedNodes = await findCommentThreadNodes(postId, hiddenAuthorIds, frontier);
    if (fetchedNodes.length === 0) {
      break;
    }

    fetchedNodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    frontier = [
      ...new Set(
        fetchedNodes
          .map((node) => node.parentId)
          .filter((parentId): parentId is string => parentId !== null)
          .filter((parentId) => !nodeMap.has(parentId)),
      ),
    ];
  }

  const rootIdByCommentId = new Map<string, string | null>();
  for (const comment of bestComments) {
    const visited = new Set<string>();
    let currentNode = nodeMap.get(comment.id);

    while (currentNode && currentNode.parentId && !visited.has(currentNode.id)) {
      visited.add(currentNode.id);
      currentNode = nodeMap.get(currentNode.parentId);
    }

    rootIdByCommentId.set(comment.id, currentNode?.id ?? null);
  }

  const uniqueRootIds = [...new Set([...rootIdByCommentId.values()].filter(Boolean) as string[])];
  const pageByRootId = new Map<string, number | null>();

  await Promise.all(
    uniqueRootIds.map(async (rootId) => {
      const rootNode = nodeMap.get(rootId);
      if (!rootNode) {
        pageByRootId.set(rootId, null);
        return;
      }

      const newerRootCount = await prisma.comment.count({
        where: buildCommentWhere(postId, hiddenAuthorIds, {
          parentId: null,
          OR: [
            {
              createdAt: {
                gt: rootNode.createdAt,
              },
            },
            {
              createdAt: rootNode.createdAt,
              id: {
                gt: rootId,
              },
            },
          ],
        }),
      });

      pageByRootId.set(rootId, Math.max(1, Math.ceil((newerRootCount + 1) / Math.max(limit, 1))));
    }),
  );

  return bestComments.map((comment) => {
    const threadRootId = rootIdByCommentId.get(comment.id) ?? null;
    return {
      ...comment,
      threadRootId,
      threadPage: threadRootId ? (pageByRootId.get(threadRootId) ?? null) : null,
    };
  });
}

export async function listComments(
  postId: string,
  viewerId?: string,
  options?: {
    page?: number;
    limit?: number;
  },
) {
  const { blockedAuthorIds, mutedAuthorIds } = await listHiddenAuthorGroupsForViewer(viewerId);
  const requestedPage = normalizeCommentPageParam(options?.page);
  const limit = normalizeCommentLimitParam(options?.limit);

  const runListComments = async () => {
    const rootWhere = buildCommentWhere(postId, blockedAuthorIds, {
      parentId: null,
    });
    const totalWhere = buildCommentWhere(postId, blockedAuthorIds);
    const [totalRootCount, totalCount, bestComments] = await Promise.all([
      prisma.comment.count({ where: rootWhere }),
      prisma.comment.count({ where: totalWhere }),
      listBestComments(postId, blockedAuthorIds, viewerId),
    ]);
    const bestCommentsWithContext = applyMutedCommentPlaceholders(
      await attachBestCommentThreadContext(
        postId,
        blockedAuthorIds,
        bestComments,
        limit,
      ),
      mutedAuthorIds,
    );

    const totalPages = Math.max(1, Math.ceil(totalRootCount / limit));
    const page = Math.min(requestedPage, totalPages);
    const roots = await findComments(
      {
        where: rootWhere,
        orderBy: ROOT_COMMENT_ORDER_BY,
        skip: (page - 1) * limit,
        take: limit,
      },
      viewerId,
    );
    const descendants = await listCommentDescendants(
      postId,
      blockedAuthorIds,
      roots.map((comment) => comment.id),
      viewerId,
    );
    const comments = applyMutedCommentPlaceholders(
      [...roots, ...sortCommentsChronologically(descendants)],
      mutedAuthorIds,
    );

    return {
      comments,
      bestComments: bestCommentsWithContext,
      totalCount,
      totalRootCount,
      page,
      totalPages,
      limit,
    };
  };

  const shouldCache = !viewerId && blockedAuthorIds.length === 0 && mutedAuthorIds.length === 0;
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
