"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth";
import { enforceRateLimit } from "@/server/rate-limit";
import { createComment, deleteComment, updateComment } from "@/server/services/comment.service";
import { ServiceError } from "@/server/services/service-error";

type CommentActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function createCommentAction(
  postId: string,
  input: unknown,
    parentId?: string,
): Promise<CommentActionResult> {
  try {
    const user = await requireCurrentUser();

    enforceRateLimit({ key: `comments:${user.id}`, limit: 10, windowMs: 60_000 });
    await createComment({ authorId: user.id, postId, input, parentId });
    revalidatePath(`/posts/${postId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

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
  try {
    const user = await requireCurrentUser();

    await updateComment({ commentId, authorId: user.id, input });
    revalidatePath(`/posts/${postId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

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
  try {
    const user = await requireCurrentUser();

    await deleteComment({ commentId, authorId: user.id });
    revalidatePath(`/posts/${postId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}
