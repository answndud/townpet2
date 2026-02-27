import { PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";

const NO_VIEWER_ID = "__NO_VIEWER__";

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
  author: { select: { id: true, name: true, nickname: true, email: true } },
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

export async function listComments(postId: string, viewerId?: string) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const baseArgs = {
    where: {
      postId,
      status: { in: [PostStatus.ACTIVE, PostStatus.DELETED] },
      ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
    },
    orderBy: { createdAt: "asc" as const },
  };

  const runListComments = async () =>
    prisma.comment
      .findMany({
        ...baseArgs,
        select: buildCommentSelect(viewerId, true, Boolean(viewerId)),
      })
      .catch(async (error) => {
        if (!isUnknownGuestAuthorIncludeError(error)) {
          throw error;
        }

        return prisma.comment.findMany({
          ...baseArgs,
          select: buildCommentSelect(viewerId, false, Boolean(viewerId)),
        });
      });

  const shouldCache = !viewerId && hiddenAuthorIds.length === 0;
  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-comments", { postId });
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
      author: { select: { id: true, name: true, nickname: true } },
    },
  });
}

export async function countReplies(commentId: string) {
  return prisma.comment.count({
    where: { parentId: commentId, status: PostStatus.ACTIVE },
  });
}
