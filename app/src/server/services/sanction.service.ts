import { Prisma, SanctionLevel } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

type UserSanctionRecord = {
  id: string;
  userId: string;
  moderatorId: string;
  level: SanctionLevel;
  reason: string;
  sourceReportId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

type UserSanctionDelegate = {
  findFirst(args: Prisma.UserSanctionFindFirstArgs): Promise<UserSanctionRecord | null>;
  create(args: Prisma.UserSanctionCreateArgs): Promise<UserSanctionRecord>;
};

type IssueNextUserSanctionParams = {
  userId: string;
  moderatorId: string;
  reason: string;
  sourceReportId?: string;
};

const SUSPENSION_LEVELS = [SanctionLevel.SUSPEND_7D, SanctionLevel.SUSPEND_30D] as const;
const RESTRICTED_LEVELS = [...SUSPENSION_LEVELS, SanctionLevel.PERMANENT_BAN] as const;

let missingDelegateWarned = false;
let missingTableWarned = false;

function getUserSanctionDelegate() {
  const delegate = (
    prisma as unknown as { userSanction?: UserSanctionDelegate }
  ).userSanction;

  if (!delegate && !missingDelegateWarned && process.env.NODE_ENV !== "test") {
    missingDelegateWarned = true;
    logger.warn("Prisma Client에 UserSanction 모델이 없어 제재 기능을 비활성화합니다.");
  }

  return delegate ?? null;
}

function isUserSanctionTableMissingError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

function warnMissingSanctionTable(error: unknown) {
  if (missingTableWarned || process.env.NODE_ENV === "test") {
    return;
  }
  missingTableWarned = true;
  logger.warn("UserSanction 테이블이 없어 제재 기능을 비활성화합니다.", {
    error: serializeError(error),
  });
}

function nextLevelFromPrevious(level: SanctionLevel | null) {
  if (level === null) {
    return SanctionLevel.WARNING;
  }

  if (level === SanctionLevel.WARNING) {
    return SanctionLevel.SUSPEND_7D;
  }

  if (level === SanctionLevel.SUSPEND_7D) {
    return SanctionLevel.SUSPEND_30D;
  }

  return SanctionLevel.PERMANENT_BAN;
}

function calculateExpiresAt(level: SanctionLevel, now: Date) {
  if (level === SanctionLevel.SUSPEND_7D) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  if (level === SanctionLevel.SUSPEND_30D) {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  return null;
}

export function formatSanctionLevelLabel(level: SanctionLevel) {
  switch (level) {
    case SanctionLevel.WARNING:
      return "경고";
    case SanctionLevel.SUSPEND_7D:
      return "7일 정지";
    case SanctionLevel.SUSPEND_30D:
      return "30일 정지";
    case SanctionLevel.PERMANENT_BAN:
      return "영구 정지";
    default:
      return level;
  }
}

export async function issueNextUserSanction({
  userId,
  moderatorId,
  reason,
  sourceReportId,
}: IssueNextUserSanctionParams) {
  const delegate = getUserSanctionDelegate();
  if (!delegate) {
    return null;
  }

  let latest: UserSanctionRecord | null = null;
  try {
    latest = await delegate.findFirst({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (error) {
    if (!isUserSanctionTableMissingError(error)) {
      throw error;
    }
    warnMissingSanctionTable(error);
    return null;
  }

  const level = nextLevelFromPrevious(latest?.level ?? null);
  const now = new Date();
  const expiresAt = calculateExpiresAt(level, now);

  try {
    return await delegate.create({
      data: {
        userId,
        moderatorId,
        level,
        reason,
        sourceReportId,
        expiresAt,
      },
    });
  } catch (error) {
    if (!isUserSanctionTableMissingError(error)) {
      throw error;
    }
    warnMissingSanctionTable(error);
    return null;
  }
}

export async function getActiveInteractionSanction(userId: string) {
  const delegate = getUserSanctionDelegate();
  if (!delegate) {
    return null;
  }

  try {
    return await delegate.findFirst({
      where: {
        userId,
        level: {
          in: [...RESTRICTED_LEVELS],
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (error) {
    if (!isUserSanctionTableMissingError(error)) {
      throw error;
    }
    warnMissingSanctionTable(error);
    return null;
  }
}
