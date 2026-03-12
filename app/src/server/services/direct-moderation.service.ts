import {
  ModerationActionType,
  ModerationTargetType,
  PostStatus,
  Prisma,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  directPostVisibilitySchema,
  directUserContentHideSchema,
  directUserContentRestoreSchema,
  directUserSanctionSchema,
  getDirectUserContentScopeLabel,
} from "@/lib/validations/direct-moderation";
import {
  bumpFeedCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";
import {
  createModerationActionLogs,
  type ModerationActionLogInput,
} from "@/server/moderation-action-log";
import { findUserByEmailInsensitive } from "@/server/queries/user.queries";
import {
  formatSanctionLevelLabel,
  issueNextUserSanction,
} from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";

const DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION = "DIRECT_HIDE_USER_CONTENT";
const DIRECT_RESTORE_USER_CONTENT_SOURCE_ACTION = "DIRECT_RESTORE_USER_CONTENT";
const DIRECT_POST_VISIBILITY_TOGGLE_SOURCE_ACTION = "DIRECT_POST_VISIBILITY_TOGGLE";

const DIRECT_MODERATION_TARGET_USER_SELECT = {
  id: true,
  email: true,
  nickname: true,
  role: true,
} satisfies Prisma.UserSelect;

type DirectModerationTargetUser = Prisma.UserGetPayload<{
  select: typeof DIRECT_MODERATION_TARGET_USER_SELECT;
}>;

type DirectModerationTargetUserSummary = {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
};

const DIRECT_MODERATION_TARGET_POST_SELECT = {
  id: true,
  title: true,
  status: true,
  authorId: true,
  author: {
    select: DIRECT_MODERATION_TARGET_USER_SELECT,
  },
} satisfies Prisma.PostSelect;

type DirectModerationTargetPost = Prisma.PostGetPayload<{
  select: typeof DIRECT_MODERATION_TARGET_POST_SELECT;
}>;

type DirectModerationTargetPostSummary = {
  id: string;
  title: string;
  status: PostStatus;
};

function buildContentCreatedAtFilter(scope: "LAST_24H" | "LAST_7D" | "ALL_ACTIVE") {
  if (scope === "ALL_ACTIVE") {
    return undefined;
  }

  const now = Date.now();
  const windowMs = scope === "LAST_24H" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return { gte: new Date(now - windowMs) };
}

function summarizeTargetUser(
  user: DirectModerationTargetUser,
): DirectModerationTargetUserSummary {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
  };
}

function summarizeTargetPost(
  post: DirectModerationTargetPost,
): DirectModerationTargetPostSummary {
  return {
    id: post.id,
    title: post.title,
    status: post.status,
  };
}

async function resolveDirectModerationTargetUser(userKey: string) {
  if (userKey.includes("@")) {
    return findUserByEmailInsensitive(userKey, DIRECT_MODERATION_TARGET_USER_SELECT);
  }

  return prisma.user.findUnique({
    where: { id: userKey },
    select: DIRECT_MODERATION_TARGET_USER_SELECT,
  });
}

function assertDirectModerationTarget(
  targetUser: DirectModerationTargetUser,
  moderatorId: string,
) {
  if (targetUser.id === moderatorId) {
    throw new ServiceError(
      "자기 자신은 직접 모더레이션 대상으로 처리할 수 없습니다.",
      "INVALID_TARGET",
      400,
    );
  }

  if (targetUser.role !== UserRole.USER) {
    throw new ServiceError(
      "직접 모더레이션 도구는 일반 사용자 계정에만 사용할 수 있습니다.",
      "DIRECT_MODERATION_USER_ONLY",
      403,
    );
  }
}

async function bumpModerationTargetCaches() {
  await Promise.allSettled([
    bumpFeedCacheVersion(),
    bumpPostCommentsCacheVersion(),
    bumpPostDetailCacheVersion(),
    bumpSearchCacheVersion(),
    bumpSuggestCacheVersion(),
  ]);
}

function extractModerationSourceAction(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  if (!("sourceAction" in metadata)) {
    return null;
  }

  return typeof metadata.sourceAction === "string" ? metadata.sourceAction : null;
}

function buildLatestModerationActionMap(
  logs: Array<{
    targetId: string;
    action: ModerationActionType;
    metadata: Prisma.JsonValue | null;
  }>,
) {
  const latestByTargetId = new Map<
    string,
    { action: ModerationActionType; sourceAction: string | null }
  >();

  for (const log of logs) {
    if (latestByTargetId.has(log.targetId)) {
      continue;
    }

    latestByTargetId.set(log.targetId, {
      action: log.action,
      sourceAction: extractModerationSourceAction(log.metadata),
    });
  }

  return latestByTargetId;
}

async function listRestorableTargetIds(params: {
  tx: Prisma.TransactionClient;
  targetType: "POST" | "COMMENT";
  targetIds: string[];
}) {
  if (params.targetIds.length === 0) {
    return [];
  }

  const logs = await params.tx.moderationActionLog.findMany({
    where: {
      targetType: params.targetType,
      targetId: { in: params.targetIds },
      action: {
        in: [ModerationActionType.TARGET_HIDDEN, ModerationActionType.TARGET_UNHIDDEN],
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      targetId: true,
      action: true,
      metadata: true,
    },
  });

  const latestByTargetId = buildLatestModerationActionMap(logs);
  return params.targetIds.filter((targetId) => {
    const latest = latestByTargetId.get(targetId);
    return (
      latest?.action === ModerationActionType.TARGET_HIDDEN &&
      latest.sourceAction === DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION
    );
  });
}

export async function applyDirectUserSanction(params: {
  moderatorId: string;
  input: unknown;
}) {
  const parsed = directUserSanctionSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ServiceError("직접 제재 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const targetUser = await resolveDirectModerationTargetUser(parsed.data.userKey);
  if (!targetUser) {
    throw new ServiceError("대상 사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  assertDirectModerationTarget(targetUser, params.moderatorId);

  const sanction = await issueNextUserSanction({
    userId: targetUser.id,
    moderatorId: params.moderatorId,
    reason: `직접 모더레이션: ${parsed.data.reason}`,
  });

  if (!sanction) {
    throw new ServiceError("제재를 발급하지 못했습니다.", "SANCTION_NOT_ISSUED", 500);
  }

  return {
    targetUser: summarizeTargetUser(targetUser),
    sanctionLevel: sanction.level,
    sanctionLabel: formatSanctionLevelLabel(sanction.level),
  };
}

export async function toggleDirectPostVisibility(params: {
  moderatorId: string;
  postId: string;
  input: unknown;
}) {
  const parsed = directPostVisibilitySchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ServiceError("게시글 모더레이션 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const targetPost = await prisma.post.findUnique({
    where: { id: params.postId },
    select: DIRECT_MODERATION_TARGET_POST_SELECT,
  });
  if (!targetPost) {
    throw new ServiceError("게시글을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  assertDirectModerationTarget(targetPost.author, params.moderatorId);

  if (targetPost.status === PostStatus.DELETED) {
    throw new ServiceError(
      "삭제된 게시글은 직접 숨김/숨김 해제를 적용할 수 없습니다.",
      "POST_NOT_MODERATABLE",
      409,
    );
  }

  const nextStatus =
    parsed.data.action === "HIDE" ? PostStatus.HIDDEN : PostStatus.ACTIVE;
  if (targetPost.status === nextStatus) {
    return {
      changed: false,
      action: parsed.data.action,
      previousStatus: targetPost.status,
      post: summarizeTargetPost(targetPost),
      targetUser: summarizeTargetUser(targetPost.author),
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: targetPost.id },
      data: {
        status: nextStatus,
      },
    });

    await createModerationActionLogs({
      delegate: tx.moderationActionLog,
      inputs: [
        {
          actorId: params.moderatorId,
          action:
            parsed.data.action === "HIDE"
              ? ModerationActionType.TARGET_HIDDEN
              : ModerationActionType.TARGET_UNHIDDEN,
          targetType: ModerationTargetType.POST,
          targetId: targetPost.id,
          targetUserId: targetPost.authorId,
          metadata: {
            sourceAction: DIRECT_POST_VISIBILITY_TOGGLE_SOURCE_ACTION,
            reason: parsed.data.reason,
            previousStatus: targetPost.status,
            nextStatus,
          },
        },
      ],
    });

    return {
      changed: true,
      action: parsed.data.action,
      previousStatus: targetPost.status,
      post: {
        ...summarizeTargetPost(targetPost),
        status: nextStatus,
      },
      targetUser: summarizeTargetUser(targetPost.author),
    };
  });

  await bumpModerationTargetCaches();

  return result;
}

export async function hideDirectUserContent(params: {
  moderatorId: string;
  input: unknown;
}) {
  const parsed = directUserContentHideSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ServiceError("콘텐츠 숨김 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const targetUser = await resolveDirectModerationTargetUser(parsed.data.userKey);
  if (!targetUser) {
    throw new ServiceError("대상 사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  assertDirectModerationTarget(targetUser, params.moderatorId);

  const createdAt = buildContentCreatedAtFilter(parsed.data.scope);
  const hidden = await prisma.$transaction(async (tx) => {
    const [targetPosts, targetComments] = await Promise.all([
      tx.post.findMany({
        where: {
          authorId: targetUser.id,
          status: PostStatus.ACTIVE,
          ...(createdAt ? { createdAt } : {}),
        },
        select: {
          id: true,
        },
      }),
      tx.comment.findMany({
        where: {
          authorId: targetUser.id,
          status: PostStatus.ACTIVE,
          ...(createdAt ? { createdAt } : {}),
        },
        select: {
          id: true,
          postId: true,
        },
      }),
    ]);

    const hiddenPostIds = targetPosts.map((post) => post.id);
    const hiddenCommentIds = targetComments.map((comment) => comment.id);

    if (hiddenPostIds.length > 0) {
      await tx.post.updateMany({
        where: {
          id: { in: hiddenPostIds },
        },
        data: {
          status: PostStatus.HIDDEN,
        },
      });
    }

    const affectedCommentPostIds = Array.from(
      new Set(targetComments.map((comment) => comment.postId)),
    );

    if (hiddenCommentIds.length > 0) {
      await tx.comment.updateMany({
        where: {
          id: { in: hiddenCommentIds },
        },
        data: {
          status: PostStatus.DELETED,
        },
      });

      const activeComments = await tx.comment.findMany({
        where: {
          postId: { in: affectedCommentPostIds },
          status: PostStatus.ACTIVE,
        },
        select: {
          postId: true,
        },
      });
      const activeCountByPostId = new Map<string, number>();
      for (const postId of affectedCommentPostIds) {
        activeCountByPostId.set(postId, 0);
      }
      for (const comment of activeComments) {
        activeCountByPostId.set(
          comment.postId,
          (activeCountByPostId.get(comment.postId) ?? 0) + 1,
        );
      }

      await Promise.all(
        affectedCommentPostIds.map((postId) =>
          tx.post.update({
            where: { id: postId },
            data: {
              commentCount: activeCountByPostId.get(postId) ?? 0,
            },
          }),
        ),
      );
    }

    const moderationLogs: ModerationActionLogInput[] = [
      ...hiddenPostIds.map((postId) => ({
        actorId: params.moderatorId,
        action: ModerationActionType.TARGET_HIDDEN,
        targetType: ModerationTargetType.POST,
        targetId: postId,
        targetUserId: targetUser.id,
        metadata: {
          sourceAction: DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION,
          reason: parsed.data.reason,
          scope: parsed.data.scope,
        },
      })),
      ...targetComments.map((comment) => ({
        actorId: params.moderatorId,
        action: ModerationActionType.TARGET_HIDDEN,
        targetType: ModerationTargetType.COMMENT,
        targetId: comment.id,
        targetUserId: targetUser.id,
        metadata: {
          sourceAction: DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION,
          reason: parsed.data.reason,
          scope: parsed.data.scope,
          postId: comment.postId,
        },
      })),
    ];

    if (moderationLogs.length > 0) {
      await createModerationActionLogs({
        delegate: tx.moderationActionLog,
        inputs: moderationLogs,
      });
    }

    return {
      hiddenPostCount: hiddenPostIds.length,
      hiddenCommentCount: hiddenCommentIds.length,
    };
  });

  if (hidden.hiddenPostCount > 0 || hidden.hiddenCommentCount > 0) {
    await bumpModerationTargetCaches();
  }

  return {
    targetUser: summarizeTargetUser(targetUser),
    scope: parsed.data.scope,
    scopeLabel: getDirectUserContentScopeLabel(parsed.data.scope),
    hiddenPostCount: hidden.hiddenPostCount,
    hiddenCommentCount: hidden.hiddenCommentCount,
  };
}

export async function restoreDirectUserContent(params: {
  moderatorId: string;
  input: unknown;
}) {
  const parsed = directUserContentRestoreSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ServiceError("콘텐츠 복구 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const targetUser = await resolveDirectModerationTargetUser(parsed.data.userKey);
  if (!targetUser) {
    throw new ServiceError("대상 사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  assertDirectModerationTarget(targetUser, params.moderatorId);

  const createdAt = buildContentCreatedAtFilter(parsed.data.scope);
  const restored = await prisma.$transaction(async (tx) => {
    const [hiddenPosts, deletedComments] = await Promise.all([
      tx.post.findMany({
        where: {
          authorId: targetUser.id,
          status: PostStatus.HIDDEN,
          ...(createdAt ? { createdAt } : {}),
        },
        select: {
          id: true,
        },
      }),
      tx.comment.findMany({
        where: {
          authorId: targetUser.id,
          status: PostStatus.DELETED,
          ...(createdAt ? { createdAt } : {}),
        },
        select: {
          id: true,
          postId: true,
        },
      }),
    ]);

    const restorablePostIds = await listRestorableTargetIds({
      tx,
      targetType: ModerationTargetType.POST,
      targetIds: hiddenPosts.map((post) => post.id),
    });
    const restorableCommentIds = await listRestorableTargetIds({
      tx,
      targetType: ModerationTargetType.COMMENT,
      targetIds: deletedComments.map((comment) => comment.id),
    });

    if (restorablePostIds.length > 0) {
      await tx.post.updateMany({
        where: {
          id: { in: restorablePostIds },
        },
        data: {
          status: PostStatus.ACTIVE,
        },
      });
    }

    const restorableComments = deletedComments.filter((comment) =>
      restorableCommentIds.includes(comment.id),
    );
    const affectedCommentPostIds = Array.from(
      new Set(restorableComments.map((comment) => comment.postId)),
    );

    if (restorableCommentIds.length > 0) {
      await tx.comment.updateMany({
        where: {
          id: { in: restorableCommentIds },
        },
        data: {
          status: PostStatus.ACTIVE,
        },
      });

      const activeComments = await tx.comment.findMany({
        where: {
          postId: { in: affectedCommentPostIds },
          status: PostStatus.ACTIVE,
        },
        select: {
          postId: true,
        },
      });
      const activeCountByPostId = new Map<string, number>();
      for (const postId of affectedCommentPostIds) {
        activeCountByPostId.set(postId, 0);
      }
      for (const comment of activeComments) {
        activeCountByPostId.set(
          comment.postId,
          (activeCountByPostId.get(comment.postId) ?? 0) + 1,
        );
      }

      await Promise.all(
        affectedCommentPostIds.map((postId) =>
          tx.post.update({
            where: { id: postId },
            data: {
              commentCount: activeCountByPostId.get(postId) ?? 0,
            },
          }),
        ),
      );
    }

    const moderationLogs: ModerationActionLogInput[] = [
      ...restorablePostIds.map((postId) => ({
        actorId: params.moderatorId,
        action: ModerationActionType.TARGET_UNHIDDEN,
        targetType: ModerationTargetType.POST,
        targetId: postId,
        targetUserId: targetUser.id,
        metadata: {
          sourceAction: DIRECT_RESTORE_USER_CONTENT_SOURCE_ACTION,
          restoredFrom: DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION,
          reason: parsed.data.reason,
          scope: parsed.data.scope,
        },
      })),
      ...restorableComments.map((comment) => ({
        actorId: params.moderatorId,
        action: ModerationActionType.TARGET_UNHIDDEN,
        targetType: ModerationTargetType.COMMENT,
        targetId: comment.id,
        targetUserId: targetUser.id,
        metadata: {
          sourceAction: DIRECT_RESTORE_USER_CONTENT_SOURCE_ACTION,
          restoredFrom: DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION,
          reason: parsed.data.reason,
          scope: parsed.data.scope,
          postId: comment.postId,
        },
      })),
    ];

    if (moderationLogs.length > 0) {
      await createModerationActionLogs({
        delegate: tx.moderationActionLog,
        inputs: moderationLogs,
      });
    }

    return {
      restoredPostCount: restorablePostIds.length,
      restoredCommentCount: restorableCommentIds.length,
    };
  });

  if (restored.restoredPostCount > 0 || restored.restoredCommentCount > 0) {
    await bumpModerationTargetCaches();
  }

  return {
    targetUser: summarizeTargetUser(targetUser),
    scope: parsed.data.scope,
    scopeLabel: getDirectUserContentScopeLabel(parsed.data.scope),
    restoredPostCount: restored.restoredPostCount,
    restoredCommentCount: restored.restoredCommentCount,
  };
}
