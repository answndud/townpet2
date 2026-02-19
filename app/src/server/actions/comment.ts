"use server";

import { CommentReactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  createComment,
  deleteComment,
  toggleCommentReaction,
  updateComment,
} from "@/server/services/comment.service";
import { ServiceError } from "@/server/services/service-error";

type CommentActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

type CommentReactionInput = "LIKE" | "DISLIKE";

type CommentReactionActionResult =
  | {
      ok: true;
      commentId: string;
      reaction: CommentReactionInput | null;
      likeCount: number;
      dislikeCount: number;
    }
  | { ok: false; code: string; message: string };

export async function createCommentAction(
  postId: string,
  input: unknown,
  parentId?: string,
): Promise<CommentActionResult> {
  let userId: string | undefined;

  try {
    const user = await requireCurrentUser();
    userId = user.id;

    await enforceRateLimit({ key: `comments:${user.id}`, limit: 10, windowMs: 60_000 });
    await createComment({ authorId: user.id, postId, input, parentId });
    revalidatePath(`/posts/${postId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    await monitorUnhandledError(error, {
      route: "action:createCommentAction",
      userId,
      extra: { postId },
    });
    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function updateCommentAction(
  postId: string,
  commentId: string,
  input: unknown,
): Promise<CommentActionResult> {
  let userId: string | undefined;

  try {
    const user = await requireCurrentUser();
    userId = user.id;

    await updateComment({ commentId, authorId: user.id, input });
    revalidatePath(`/posts/${postId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    await monitorUnhandledError(error, {
      route: "action:updateCommentAction",
      userId,
      extra: { postId, commentId },
    });
    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function deleteCommentAction(
  postId: string,
  commentId: string,
): Promise<CommentActionResult> {
  let userId: string | undefined;

  try {
    const user = await requireCurrentUser();
    userId = user.id;

    await deleteComment({ commentId, authorId: user.id });
    revalidatePath(`/posts/${postId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    await monitorUnhandledError(error, {
      route: "action:deleteCommentAction",
      userId,
      extra: { postId, commentId },
    });
    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}

export async function toggleCommentReactionAction(
  postId: string,
  commentId: string,
  type: CommentReactionInput,
): Promise<CommentReactionActionResult> {
  let userId: string | undefined;

  try {
    const user = await requireCurrentUser();
    userId = user.id;
    await enforceRateLimit({
      key: `comment-reaction:${user.id}`,
      limit: 30,
      windowMs: 60_000,
    });

    const result = await toggleCommentReaction({
      commentId,
      userId: user.id,
      type: type as CommentReactionType,
    });

    revalidatePath(`/posts/${postId}`);
    return {
      ok: true,
      commentId: result.commentId,
      reaction: result.reaction as CommentReactionInput | null,
      likeCount: result.likeCount,
      dislikeCount: result.dislikeCount,
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    await monitorUnhandledError(error, {
      route: "action:toggleCommentReactionAction",
      userId,
      extra: { postId, commentId, type },
    });
    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}
