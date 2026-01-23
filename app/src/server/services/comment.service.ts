import { PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { commentCreateSchema, commentUpdateSchema } from "@/lib/validations/comment";
import { ServiceError } from "@/server/services/service-error";

type CreateCommentParams = {
  authorId: string;
  postId: string;
  input: unknown;
  parentId?: string;
};

export async function createComment({
  authorId,
  postId,
  input,
  parentId,
}: CreateCommentParams) {
  const parsed = commentCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("댓글 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
    }

    if (parentId) {
      const parent = await tx.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, status: true },
      });

      if (!parent || parent.postId !== postId || parent.status !== PostStatus.ACTIVE) {
        throw new ServiceError("대댓글을 달 수 없습니다.", "INVALID_PARENT", 400);
      }
    }

    const comment = await tx.comment.create({
      data: {
        postId,
        authorId,
        content: parsed.data.content,
        parentId: parentId ?? null,
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
      },
    });

    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  });
}

type UpdateCommentParams = {
  commentId: string;
  authorId: string;
  input: unknown;
};

export async function updateComment({
  commentId,
  authorId,
  input,
}: UpdateCommentParams) {
  const parsed = commentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("댓글 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, status: true },
    });

    if (!comment || comment.status !== PostStatus.ACTIVE) {
      throw new ServiceError("댓글을 찾을 수 없습니다.", "COMMENT_NOT_FOUND", 404);
    }

    if (comment.authorId !== authorId) {
      throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
    }

    const replyCount = await tx.comment.count({
      where: { parentId: commentId, status: PostStatus.ACTIVE },
    });

    if (replyCount > 0) {
      throw new ServiceError("대댓글이 있으면 수정할 수 없습니다.", "HAS_REPLIES", 400);
    }

    return tx.comment.update({
      where: { id: commentId },
      data: { content: parsed.data.content },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
      },
    });
  });
}

type DeleteCommentParams = {
  commentId: string;
  authorId: string;
};

export async function deleteComment({ commentId, authorId }: DeleteCommentParams) {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, status: true, postId: true },
    });

    if (!comment || comment.status !== PostStatus.ACTIVE) {
      throw new ServiceError("댓글을 찾을 수 없습니다.", "COMMENT_NOT_FOUND", 404);
    }

    if (comment.authorId !== authorId) {
      throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
    }

    const replyCount = await tx.comment.count({
      where: { parentId: commentId, status: PostStatus.ACTIVE },
    });

    if (replyCount > 0) {
      throw new ServiceError("대댓글이 있으면 삭제할 수 없습니다.", "HAS_REPLIES", 400);
    }

    const deleted = await tx.comment.update({
      where: { id: commentId },
      data: { status: PostStatus.DELETED },
      select: { id: true, postId: true },
    });

    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    return deleted;
  });
}
