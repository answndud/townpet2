"use server";

import { revalidatePath } from "next/cache";

import { deletePost, createPost, updatePost } from "@/server/services/post.service";
import { ServiceError } from "@/server/services/service-error";
import { requireCurrentUser } from "@/server/auth";

type PostActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function createPostAction(input: unknown): Promise<PostActionResult> {
  try {
    const user = await requireCurrentUser();

    await createPost({ authorId: user.id, input });
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
