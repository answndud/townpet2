"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth";
import {
  setPrimaryNeighborhood,
  updateProfile,
  updateProfileImage,
} from "@/server/services/user.service";
import { ServiceError } from "@/server/services/service-error";

type UserActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function updateProfileAction(input: unknown): Promise<UserActionResult> {
  try {
    const user = await requireCurrentUser();
    await updateProfile({ userId: user.id, input });
    revalidatePath("/profile");
    revalidatePath("/onboarding");
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

export async function setPrimaryNeighborhoodAction(
  input: unknown,
): Promise<UserActionResult> {
  try {
    const user = await requireCurrentUser();
    await setPrimaryNeighborhood({ userId: user.id, input });
    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/onboarding");
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

export async function updateProfileImageAction(input: unknown): Promise<UserActionResult> {
  try {
    const user = await requireCurrentUser();
    await updateProfileImage({ userId: user.id, input });
    revalidatePath("/profile");
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
