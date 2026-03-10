"use server";

import { revalidatePath } from "next/cache";

import { unstable_update } from "@/lib/auth";
import { requireCurrentUser } from "@/server/auth";
import {
  bumpFeedCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";
import {
  setPrimaryNeighborhood,
  updatePreferredPetTypes,
  updateProfile,
  updateProfileImage,
} from "@/server/services/user.service";
import { ServiceError } from "@/server/services/service-error";

type UserActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function bumpUserPresentationCaches() {
  void bumpFeedCacheVersion().catch(() => undefined);
  void bumpSearchCacheVersion().catch(() => undefined);
  void bumpSuggestCacheVersion().catch(() => undefined);
  void bumpPostDetailCacheVersion().catch(() => undefined);
  void bumpPostCommentsCacheVersion().catch(() => undefined);
}

export async function updateProfileAction(input: unknown): Promise<UserActionResult> {
  try {
    const user = await requireCurrentUser();
    const updatedUser = await updateProfile({ userId: user.id, input });
    try {
      await unstable_update({
        user: {
          nickname: updatedUser.nickname,
        },
      });
    } catch {
      // Session refresh failure should not fail profile persistence.
    }
    revalidatePath("/profile");
    revalidatePath("/feed");
    revalidatePath("/search");
    revalidatePath("/bookmarks");
    revalidatePath(`/users/${user.id}`);
    revalidatePath("/onboarding");
    bumpUserPresentationCaches();
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
    const updatedUser = await updateProfileImage({ userId: user.id, input });
    try {
      await unstable_update({
        user: {
          image: updatedUser.image,
        },
      });
    } catch {
      // Session refresh failure should not fail profile image persistence.
    }
    revalidatePath("/profile");
    revalidatePath("/feed");
    revalidatePath("/search");
    revalidatePath("/bookmarks");
    revalidatePath(`/users/${user.id}`);
    bumpUserPresentationCaches();
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

export async function updatePreferredPetTypesAction(input: unknown): Promise<UserActionResult> {
  try {
    const user = await requireCurrentUser();
    await updatePreferredPetTypes({ userId: user.id, input });
    revalidatePath("/");
    revalidatePath("/feed");
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
