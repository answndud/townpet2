import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";
import { assertSchemaDelegate, rethrowSchemaSyncRequired } from "@/server/schema-sync";

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
const hiddenAuthorIdsCache = new Map<
  string,
  {
    ids: string[];
    expiresAt: number;
  }
>();
const HIDDEN_AUTHOR_IDS_CACHE_TTL_MS = 5_000;

export function invalidateHiddenAuthorIdsCache(viewerId: string) {
  hiddenAuthorIdsCache.delete(viewerId);
}

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

function requireBlockDelegate() {
  return assertSchemaDelegate(
    getBlockDelegate(),
    "UserBlock 모델이 누락되어 차단 상태를 확인할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
}

function requireMuteDelegate() {
  return assertSchemaDelegate(
    getMuteDelegate(),
    "UserMute 모델이 누락되어 뮤트 상태를 확인할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
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

function throwUserRelationSchemaSyncRequired(error: unknown): never {
  if (isMissingTableError(error)) {
    warnMissingTable(error);
  }

  rethrowSchemaSyncRequired(
    error,
    "UserBlock/UserMute 스키마가 누락되어 사용자 관계 상태를 확인할 수 없습니다. prisma generate 및 migrate deploy 후 다시 시도해 주세요.",
  );
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

  const cached = hiddenAuthorIdsCache.get(viewerId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.ids;
  }

  const blockDelegate = requireBlockDelegate();
  const muteDelegate = requireMuteDelegate();
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
    throwUserRelationSchemaSyncRequired(error);
  }

  hiddenIds.delete(viewerId);
  const resolved = Array.from(hiddenIds);
  hiddenAuthorIdsCache.set(viewerId, {
    ids: resolved,
    expiresAt: Date.now() + HIDDEN_AUTHOR_IDS_CACHE_TTL_MS,
  });
  return resolved;
}

export async function getUserRelationState(viewerId?: string, targetUserId?: string) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return {
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    } satisfies UserRelationState;
  }

  const blockDelegate = requireBlockDelegate();
  const muteDelegate = requireMuteDelegate();

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
    throwUserRelationSchemaSyncRequired(error);
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

  const blockDelegate = requireBlockDelegate();

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
    throwUserRelationSchemaSyncRequired(error);
  }
}

export async function listMyBlockedUsers(userId: string) {
  const blockDelegate = requireBlockDelegate();

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
    throwUserRelationSchemaSyncRequired(error);
  }
}

export async function listMyMutedUsers(userId: string) {
  const muteDelegate = requireMuteDelegate();

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
    throwUserRelationSchemaSyncRequired(error);
  }
}

export async function assertUserRelationControlPlaneReady() {
  const blockDelegate = requireBlockDelegate();
  const muteDelegate = requireMuteDelegate();

  try {
    await Promise.all([
      blockDelegate.findFirst({
        where: { blockerId: "__schema_probe__", blockedId: "__schema_probe__" },
        select: { id: true },
      }),
      muteDelegate.findFirst({
        where: { userId: "__schema_probe__", mutedUserId: "__schema_probe__" },
        select: { id: true },
      }),
    ]);
  } catch (error) {
    throwUserRelationSchemaSyncRequired(error);
  }
}
