"use server";

import { revalidatePath } from "next/cache";

import { requireModerator } from "@/server/auth";
import {
  deleteBreedCatalogEntry,
  upsertBreedCatalogEntry,
} from "@/server/services/breed-catalog.service";
import { ServiceError } from "@/server/services/service-error";

type BreedCatalogActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function upsertBreedCatalogEntryAction(
  input: unknown,
): Promise<BreedCatalogActionResult> {
  try {
    await requireModerator();
    await upsertBreedCatalogEntry({ input });
    revalidatePath("/profile");
    revalidatePath("/admin/breeds");
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

export async function deleteBreedCatalogEntryAction(
  input: unknown,
): Promise<BreedCatalogActionResult> {
  try {
    await requireModerator();
    await deleteBreedCatalogEntry({ input });
    revalidatePath("/profile");
    revalidatePath("/admin/breeds");
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
