import { Prisma, SanctionLevel } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

export type SanctionListItem = {
  id: string;
  userId: string;
  moderatorId: string;
  level: SanctionLevel;
  reason: string;
  sourceReportId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    nickname: string | null;
    email: string;
  };
  moderator: {
    id: string;
    nickname: string | null;
    email: string;
  };
};

type UserSanctionDelegate = {
  findMany(args: Prisma.UserSanctionFindManyArgs): Promise<SanctionListItem[]>;
};

let missingDelegateWarned = false;
let missingTableWarned = false;

function getUserSanctionDelegate() {
  const delegate = (
    prisma as unknown as { userSanction?: UserSanctionDelegate }
  ).userSanction;

  if (!delegate && !missingDelegateWarned && process.env.NODE_ENV !== "test") {
    missingDelegateWarned = true;
    logger.warn("Prisma Client에 UserSanction 모델이 없어 제재 이력을 표시하지 않습니다.");
  }

  return delegate ?? null;
}

function isMissingTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

export async function listRecentSanctions(limit = 20): Promise<SanctionListItem[]> {
  const delegate = getUserSanctionDelegate();
  if (!delegate) {
    return [];
  }

  try {
    return await delegate.findMany({
      take: Math.min(Math.max(limit, 1), 100),
      orderBy: [{ createdAt: "desc" }],
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
        moderator: {
          select: { id: true, nickname: true, email: true },
        },
      },
    });
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }

    if (!missingTableWarned && process.env.NODE_ENV !== "test") {
      missingTableWarned = true;
      logger.warn("UserSanction 테이블 조회에 실패해 제재 이력 표시를 생략합니다.", {
        error: serializeError(error),
      });
    }

    return [];
  }
}
