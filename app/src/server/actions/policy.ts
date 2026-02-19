"use server";

import { revalidatePath } from "next/cache";

import { requireModerator } from "@/server/auth";
import {
  updateForbiddenKeywordPolicy,
  updateGuestReadPolicy,
} from "@/server/services/policy.service";
import { ServiceError } from "@/server/services/service-error";

type PolicyActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function updateGuestReadPolicyAction(
  input: unknown,
): Promise<PolicyActionResult> {
  try {
    await requireModerator();
    await updateGuestReadPolicy({ input });
    revalidatePath("/feed");
    revalidatePath("/admin/policies");
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

export async function updateForbiddenKeywordPolicyAction(
  input: unknown,
): Promise<PolicyActionResult> {
  try {
    await requireModerator();
    await updateForbiddenKeywordPolicy({ input });
    revalidatePath("/feed");
    revalidatePath("/posts/[id]", "page");
    revalidatePath("/admin/policies");
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
