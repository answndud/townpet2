import { prisma } from "@/lib/prisma";
import { userRelationTargetSchema } from "@/lib/validations/user-relation";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { ServiceError } from "@/server/services/service-error";

type UserRelationMutationParams = {
  userId: string;
  input: unknown;
};

async function parseAndValidateTarget(userId: string, input: unknown) {
  const parsed = userRelationTargetSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("대상 사용자 정보가 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const { targetUserId } = parsed.data;
  if (targetUserId === userId) {
    throw new ServiceError("자기 자신에게는 적용할 수 없습니다.", "INVALID_TARGET", 400);
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) {
    throw new ServiceError("대상 사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  return targetUserId;
}

export async function blockUser({ userId, input }: UserRelationMutationParams) {
  const targetUserId = await parseAndValidateTarget(userId, input);
  await prisma.userBlock.upsert({
    where: {
      blockerId_blockedId: {
        blockerId: userId,
        blockedId: targetUserId,
      },
    },
    update: {},
    create: {
      blockerId: userId,
      blockedId: targetUserId,
    },
  });

  return getUserRelationState(userId, targetUserId);
}

export async function unblockUser({ userId, input }: UserRelationMutationParams) {
  const targetUserId = await parseAndValidateTarget(userId, input);
  await prisma.userBlock.deleteMany({
    where: {
      blockerId: userId,
      blockedId: targetUserId,
    },
  });

  return getUserRelationState(userId, targetUserId);
}

export async function muteUser({ userId, input }: UserRelationMutationParams) {
  const targetUserId = await parseAndValidateTarget(userId, input);
  await prisma.userMute.upsert({
    where: {
      userId_mutedUserId: {
        userId,
        mutedUserId: targetUserId,
      },
    },
    update: {},
    create: {
      userId,
      mutedUserId: targetUserId,
    },
  });

  return getUserRelationState(userId, targetUserId);
}

export async function unmuteUser({ userId, input }: UserRelationMutationParams) {
  const targetUserId = await parseAndValidateTarget(userId, input);
  await prisma.userMute.deleteMany({
    where: {
      userId,
      mutedUserId: targetUserId,
    },
  });

  return getUserRelationState(userId, targetUserId);
}
