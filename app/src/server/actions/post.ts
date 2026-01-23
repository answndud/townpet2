"use server";

import { revalidatePath } from "next/cache";

import { deletePost, createPost, updatePost } from "@/server/services/post.service";
import { ServiceError } from "@/server/services/service-error";
import { getUserByEmail } from "@/server/queries/user.queries";

type PostActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function createPostAction(input: unknown): Promise<PostActionResult> {
  try {
    const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
    const user = await getUserByEmail(email);

    if (!user) {
      return { ok: false, code: "USER_NOT_FOUND", message: "작성자를 찾을 수 없습니다." };
    }

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
    await deletePost({ postId });
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
    await updatePost({ postId, input });
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
