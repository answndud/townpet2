"use server";

import { PostReactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createPost,
  deletePost,
  togglePostReaction,
  updatePost,
} from "@/server/services/post.service";
import { logger, serializeError } from "@/server/logger";
import { ServiceError } from "@/server/services/service-error";
import { requireCurrentUser } from "@/server/auth";

type PostActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
type PostReactionInput = "LIKE" | "DISLIKE";

type PostReactionActionResult =
  | {
      ok: true;
      likeCount: number;
      dislikeCount: number;
      reaction: PostReactionInput | null;
    }
  | { ok: false; code: string; message: string };

export async function createPostAction(input: unknown): Promise<PostActionResult> {
  try {
    const user = await requireCurrentUser();

    await createPost({ authorId: user.id, input });
    revalidatePath("/feed");
    revalidatePath("/");
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

export async function deletePostAction(postId: string): Promise<PostActionResult> {
  try {
    const user = await requireCurrentUser();
    await deletePost({ postId, authorId: user.id });
    revalidatePath("/feed");
    revalidatePath("/");
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

export async function updatePostAction(
  postId: string,
  input: unknown,
): Promise<PostActionResult> {
  try {
    const user = await requireCurrentUser();
    await updatePost({ postId, authorId: user.id, input });
    revalidatePath("/feed");
    revalidatePath("/");
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

export async function togglePostReactionAction(
  postId: string,
  type: PostReactionInput,
): Promise<PostReactionActionResult> {
  try {
    if (type !== "LIKE" && type !== "DISLIKE") {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "반응 값이 올바르지 않습니다.",
      };
    }

    const user = await requireCurrentUser();
    const result = await togglePostReaction({
      postId,
      userId: user.id,
      type: type as PostReactionType,
    });
    revalidatePath("/feed");
    revalidatePath("/");
    revalidatePath(`/posts/${postId}`);

    return {
      ok: true,
      likeCount: result.likeCount,
      dislikeCount: result.dislikeCount,
      reaction: result.reaction,
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { ok: false, code: error.code, message: error.message };
    }
    logger.error("togglePostReactionAction 실패", {
      postId,
      type,
      error: serializeError(error),
    });

    return {
      ok: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    };
  }
}
