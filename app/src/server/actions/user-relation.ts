"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth";
import { ServiceError } from "@/server/services/service-error";
import {
  blockUser,
  muteUser,
  unblockUser,
  unmuteUser,
} from "@/server/services/user-relation.service";

type RelationActionResult =
  | {
      ok: true;
      state: {
        isBlockedByMe: boolean;
        hasBlockedMe: boolean;
        isMutedByMe: boolean;
      };
    }
  | { ok: false; code: string; message: string };

type RelationActionOptions = {
  revalidate?: boolean;
};

function revalidateRelationViews() {
  revalidatePath("/feed");
  revalidatePath("/search");
  revalidatePath("/profile");
  revalidatePath("/posts/[id]", "page");
}

function shouldRevalidate(options?: RelationActionOptions) {
  return options?.revalidate !== false;
}

export async function blockUserAction(
  input: unknown,
  options?: RelationActionOptions,
): Promise<RelationActionResult> {
  try {
    const user = await requireCurrentUser();
    const state = await blockUser({ userId: user.id, input });
    if (shouldRevalidate(options)) {
      revalidateRelationViews();
    }
    return { ok: true, state };
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

export async function unblockUserAction(
  input: unknown,
  options?: RelationActionOptions,
): Promise<RelationActionResult> {
  try {
    const user = await requireCurrentUser();
    const state = await unblockUser({ userId: user.id, input });
    if (shouldRevalidate(options)) {
      revalidateRelationViews();
    }
    return { ok: true, state };
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

export async function muteUserAction(
  input: unknown,
  options?: RelationActionOptions,
): Promise<RelationActionResult> {
  try {
    const user = await requireCurrentUser();
    const state = await muteUser({ userId: user.id, input });
    if (shouldRevalidate(options)) {
      revalidateRelationViews();
    }
    return { ok: true, state };
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

export async function unmuteUserAction(
  input: unknown,
  options?: RelationActionOptions,
): Promise<RelationActionResult> {
  try {
    const user = await requireCurrentUser();
    const state = await unmuteUser({ userId: user.id, input });
    if (shouldRevalidate(options)) {
      revalidateRelationViews();
    }
    return { ok: true, state };
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
