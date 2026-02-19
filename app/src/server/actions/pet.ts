"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth";
import { ServiceError } from "@/server/services/service-error";
import { createPet, deletePet, updatePet } from "@/server/services/pet.service";

type PetActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function revalidatePetPages(userId: string) {
  revalidatePath("/profile");
  revalidatePath(`/users/${userId}`);
}

export async function createPetAction(input: unknown): Promise<PetActionResult> {
  try {
    const user = await requireCurrentUser();
    await createPet({ userId: user.id, input });
    revalidatePetPages(user.id);
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

export async function updatePetAction(input: unknown): Promise<PetActionResult> {
  try {
    const user = await requireCurrentUser();
    await updatePet({ userId: user.id, input });
    revalidatePetPages(user.id);
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

export async function deletePetAction(input: unknown): Promise<PetActionResult> {
  try {
    const user = await requireCurrentUser();
    await deletePet({ userId: user.id, input });
    revalidatePetPages(user.id);
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
