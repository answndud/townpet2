import {
  forbiddenKeywordPolicyUpdateSchema,
  guestPostPolicyUpdateSchema,
  guestReadPolicyUpdateSchema,
  newUserSafetyPolicyUpdateSchema,
} from "@/lib/validations/policy";
import {
  setGuestPostPolicy,
  setNewUserSafetyPolicy,
  setForbiddenKeywords,
  setGuestReadLoginRequiredPostTypes,
} from "@/server/queries/policy.queries";
import { ServiceError } from "@/server/services/service-error";

type UpdateGuestReadPolicyParams = {
  input: unknown;
};

export async function updateGuestReadPolicy({
  input,
}: UpdateGuestReadPolicyParams) {
  const parsed = guestReadPolicyUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ServiceError("정책 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const result = await setGuestReadLoginRequiredPostTypes(
    parsed.data.loginRequiredTypes,
  );
  if (!result.ok) {
    throw new ServiceError(
      "정책 저장 전에 서버 스키마 동기화가 필요합니다. prisma generate 및 db push 후 다시 시도해 주세요.",
      "SCHEMA_SYNC_REQUIRED",
      503,
    );
  }
}

type UpdateForbiddenKeywordPolicyParams = {
  input: unknown;
};

export async function updateForbiddenKeywordPolicy({
  input,
}: UpdateForbiddenKeywordPolicyParams) {
  const parsed = forbiddenKeywordPolicyUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ServiceError("금칙어 정책 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const result = await setForbiddenKeywords(parsed.data.keywords);
  if (!result.ok) {
    throw new ServiceError(
      "정책 저장 전에 서버 스키마 동기화가 필요합니다. prisma generate 및 db push 후 다시 시도해 주세요.",
      "SCHEMA_SYNC_REQUIRED",
      503,
    );
  }
}

type UpdateNewUserSafetyPolicyParams = {
  input: unknown;
};

export async function updateNewUserSafetyPolicy({
  input,
}: UpdateNewUserSafetyPolicyParams) {
  const parsed = newUserSafetyPolicyUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ServiceError("신규 계정 안전 정책 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const result = await setNewUserSafetyPolicy(parsed.data);
  if (!result.ok) {
    throw new ServiceError(
      "정책 저장 전에 서버 스키마 동기화가 필요합니다. prisma generate 및 db push 후 다시 시도해 주세요.",
      "SCHEMA_SYNC_REQUIRED",
      503,
    );
  }
}

type UpdateGuestPostPolicyParams = {
  input: unknown;
};

export async function updateGuestPostPolicy({ input }: UpdateGuestPostPolicyParams) {
  const parsed = guestPostPolicyUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ServiceError("비회원 작성 정책 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const result = await setGuestPostPolicy(parsed.data);
  if (!result.ok) {
    throw new ServiceError(
      "정책 저장 전에 서버 스키마 동기화가 필요합니다. prisma generate 및 db push 후 다시 시도해 주세요.",
      "SCHEMA_SYNC_REQUIRED",
      503,
    );
  }
}
