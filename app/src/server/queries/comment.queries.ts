import { PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listComments(postId: string) {
  return prisma.comment.findMany({
    where: { postId, status: { in: [PostStatus.ACTIVE, PostStatus.DELETED] } },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, nickname: true } },
    },
  });
}

export async function getCommentById(commentId: string) {
  return prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      postId: true,
      status: true,
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
