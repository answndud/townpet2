import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

type UserBlockDelegate = {
  findMany(args: Prisma.UserBlockFindManyArgs): Promise<
    Array<{
      id: string;
      blockerId: string;
      blockedId: string;
      createdAt: Date;
      blocker?: { id: string; email: string; nickname: string | null };
      blocked?: { id: string; email: string; nickname: string | null };
    }>
  >;
  findFirst(args: Prisma.UserBlockFindFirstArgs): Promise<
    | {
        id: string;
      }
    | null
  >;
};

type UserMuteDelegate = {
  findMany(args: Prisma.UserMuteFindManyArgs): Promise<
    Array<{
      id: string;
      userId: string;
      mutedUserId: string;
      createdAt: Date;
      mutedUser?: { id: string; email: string; nickname: string | null };
    }>
  >;
  findFirst(args: Prisma.UserMuteFindFirstArgs): Promise<
    | {
        id: string;
      }
    | null
  >;
};

let blockDelegateWarned = false;
let muteDelegateWarned = false;
let missingTableWarned = false;

function getBlockDelegate() {
  const delegate = (prisma as unknown as { userBlock?: UserBlockDelegate }).userBlock;
  if (!delegate && !blockDelegateWarned && process.env.NODE_ENV !== "test") {
    blockDelegateWarned = true;
    logger.warn("Prisma Client에 UserBlock 모델이 없어 차단 기능을 비활성화합니다.");
  }
  return delegate ?? null;
}

function getMuteDelegate() {
  const delegate = (prisma as unknown as { userMute?: UserMuteDelegate }).userMute;
  if (!delegate && !muteDelegateWarned && process.env.NODE_ENV !== "test") {
    muteDelegateWarned = true;
    logger.warn("Prisma Client에 UserMute 모델이 없어 뮤트 기능을 비활성화합니다.");
  }
  return delegate ?? null;
}

function isMissingTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

function warnMissingTable(error: unknown) {
  if (missingTableWarned || process.env.NODE_ENV === "test") {
    return;
  }
  missingTableWarned = true;
  logger.warn("UserBlock/UserMute 테이블이 없어 사용자 관계 기능을 비활성화합니다.", {
    error: serializeError(error),
  });
}

export type UserRelationState = {
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
  isMutedByMe: boolean;
};

export async function listHiddenAuthorIdsForViewer(viewerId?: string) {
  if (!viewerId) {
    return [];
  }

  const blockDelegate = getBlockDelegate();
  const muteDelegate = getMuteDelegate();
  const hiddenIds = new Set<string>();

  try {
    if (blockDelegate) {
      const blocks = await blockDelegate.findMany({
        where: {
          OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
        },
        select: { blockerId: true, blockedId: true },
      });

      for (const block of blocks) {
        hiddenIds.add(block.blockerId === viewerId ? block.blockedId : block.blockerId);
      }
    }

    if (muteDelegate) {
      const mutes = await muteDelegate.findMany({
        where: { userId: viewerId },
        select: { mutedUserId: true },
      });

      for (const mute of mutes) {
        hiddenIds.add(mute.mutedUserId);
      }
    }
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
    warnMissingTable(error);
    return [];
  }

  hiddenIds.delete(viewerId);
  return Array.from(hiddenIds);
}

export async function getUserRelationState(viewerId?: string, targetUserId?: string) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return {
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    } satisfies UserRelationState;
  }

  const blockDelegate = getBlockDelegate();
  const muteDelegate = getMuteDelegate();

  let isBlockedByMe = false;
  let hasBlockedMe = false;
  let isMutedByMe = false;

  try {
    if (blockDelegate) {
      const [blockedByMe, blockedMe] = await Promise.all([
        blockDelegate.findFirst({
          where: {
            blockerId: viewerId,
            blockedId: targetUserId,
          },
          select: { id: true },
        }),
        blockDelegate.findFirst({
          where: {
            blockerId: targetUserId,
            blockedId: viewerId,
          },
          select: { id: true },
        }),
      ]);
      isBlockedByMe = Boolean(blockedByMe);
      hasBlockedMe = Boolean(blockedMe);
    }

    if (muteDelegate) {
      const mute = await muteDelegate.findFirst({
        where: {
          userId: viewerId,
          mutedUserId: targetUserId,
        },
        select: { id: true },
      });
      isMutedByMe = Boolean(mute);
    }
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
    warnMissingTable(error);
  }

  return {
    isBlockedByMe,
    hasBlockedMe,
    isMutedByMe,
  } satisfies UserRelationState;
}

export async function hasBlockingRelation(userId: string, targetUserId: string) {
  if (userId === targetUserId) {
    return false;
  }

  const blockDelegate = getBlockDelegate();
  if (!blockDelegate) {
    return false;
  }

  try {
    const [blockedByMe, blockedMe] = await Promise.all([
      blockDelegate.findFirst({
        where: {
          blockerId: userId,
          blockedId: targetUserId,
        },
        select: { id: true },
      }),
      blockDelegate.findFirst({
        where: {
          blockerId: targetUserId,
          blockedId: userId,
        },
        select: { id: true },
      }),
    ]);
    return Boolean(blockedByMe || blockedMe);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
    warnMissingTable(error);
    return false;
  }
}

export async function listMyBlockedUsers(userId: string) {
  const blockDelegate = getBlockDelegate();
  if (!blockDelegate) {
    return [];
  }

  try {
    return await blockDelegate.findMany({
      where: { blockerId: userId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        blocked: {
          select: { id: true, email: true, nickname: true },
        },
      },
    });
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
    warnMissingTable(error);
    return [];
  }
}

export async function listMyMutedUsers(userId: string) {
  const muteDelegate = getMuteDelegate();
  if (!muteDelegate) {
    return [];
  }

  try {
    return await muteDelegate.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        mutedUser: {
          select: { id: true, email: true, nickname: true },
        },
      },
    });
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
    warnMissingTable(error);
    return [];
  }
}
