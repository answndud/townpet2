import { CommentReactionType, GuestViolationCategory, PostStatus } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

import { moderateContactContent } from "@/lib/contact-policy";
import { findMatchedForbiddenKeywords } from "@/lib/forbidden-keyword-policy";
import { prisma } from "@/lib/prisma";
import { commentCreateSchema, commentUpdateSchema } from "@/lib/validations/comment";
import { logger, serializeError } from "@/server/logger";
import {
  getForbiddenKeywords,
  getGuestPostPolicy,
  getNewUserSafetyPolicy,
} from "@/server/queries/policy.queries";
import { hasBlockingRelation } from "@/server/queries/user-relation.queries";
import {
  notifyCommentOnPost,
  notifyReplyToComment,
} from "@/server/services/notification.service";
import {
  hashGuestIdentity,
  registerGuestViolation,
} from "@/server/services/guest-safety.service";
import { ServiceError } from "@/server/services/service-error";

type CreateCommentParams = {
  authorId: string;
  postId: string;
  input: unknown;
  parentId?: string;
  guestMeta?: {
    guestAuthorId?: string;
  };
};

const LEGACY_GUEST_COMMENT_CLAIM_WINDOW_HOURS = 24;

function verifyGuestPassword(rawPassword: string, stored: string) {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) {
    return false;
  }

  const actual = scryptSync(rawPassword, salt, 32);
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function hashGuestCommentPassword(rawPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(rawPassword, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

function matchesGuestIdentity(
  params: {
    guestIpHash: string | null;
    guestFingerprintHash: string | null;
  },
  identity: {
    ip: string;
    fingerprint?: string;
  },
) {
  const { ipHash, fingerprintHash } = hashGuestIdentity(identity);
  if (params.guestIpHash && params.guestIpHash === ipHash) {
    return true;
  }
  if (params.guestFingerprintHash && fingerprintHash && params.guestFingerprintHash === fingerprintHash) {
    return true;
  }
  return false;
}

function resolveGuestCommentCredential(params: {
  guestAuthorId?: string | null;
  guestAuthor?: {
    passwordHash: string;
    ipHash: string;
    fingerprintHash: string | null;
  } | null;
  guestDisplayName?: string | null;
  guestPasswordHash: string | null;
  guestIpHash: string | null;
  guestFingerprintHash: string | null;
  author: { email: string };
}) {
  const passwordHash = params.guestAuthor?.passwordHash ?? params.guestPasswordHash;
  return {
    passwordHash,
    ipHash: params.guestAuthor?.ipHash ?? params.guestIpHash,
    fingerprintHash: params.guestAuthor?.fingerprintHash ?? params.guestFingerprintHash,
    hasGuestMarker: Boolean(
      params.guestAuthorId ||
        params.guestDisplayName ||
        params.author.email.endsWith("@guest.townpet.local"),
    ),
  };
}

function isLegacyGuestCommentClaimable(createdAt: Date) {
  return Date.now() - createdAt.getTime() <= LEGACY_GUEST_COMMENT_CLAIM_WINDOW_HOURS * 60 * 60 * 1000;
}

export async function createComment({
  authorId,
  postId,
  input,
  parentId,
  guestMeta,
}: CreateCommentParams) {
  const parsed = commentCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("댓글 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const [author, newUserSafetyPolicy] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true, createdAt: true },
    }),
    getNewUserSafetyPolicy(),
  ]);
  if (!author) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  const contactPolicy = moderateContactContent({
    text: parsed.data.content,
    role: author.role,
    accountCreatedAt: author.createdAt,
    blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
  });
  if (contactPolicy.blocked) {
    throw new ServiceError(
      contactPolicy.message ?? "연락처가 포함된 댓글은 현재 계정으로 작성할 수 없습니다.",
      "CONTACT_RESTRICTED_FOR_NEW_USER",
      403,
    );
  }
  const safeContent = contactPolicy.sanitizedText;
  const forbiddenKeywords = await getForbiddenKeywords();
  const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
    safeContent,
    forbiddenKeywords,
  );
  if (matchedForbiddenKeywords.length > 0) {
    throw new ServiceError(
      `금칙어가 포함되어 댓글을 저장할 수 없습니다. (${matchedForbiddenKeywords
        .slice(0, 3)
        .join(", ")})`,
      "FORBIDDEN_KEYWORD_DETECTED",
      400,
    );
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, authorId: true, title: true },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
    }

    if (await hasBlockingRelation(authorId, post.authorId)) {
      throw new ServiceError(
        "차단 관계에서는 댓글을 작성할 수 없습니다.",
        "USER_BLOCK_RELATION",
        403,
      );
    }

    let parentAuthorId: string | null = null;

    if (parentId) {
      const parent = await tx.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, status: true, authorId: true },
      });

      if (!parent || parent.postId !== postId || parent.status !== PostStatus.ACTIVE) {
        throw new ServiceError("대댓글을 달 수 없습니다.", "INVALID_PARENT", 400);
      }

      if (await hasBlockingRelation(authorId, parent.authorId)) {
        throw new ServiceError(
          "차단 관계에서는 대댓글을 작성할 수 없습니다.",
          "USER_BLOCK_RELATION",
          403,
        );
      }

      parentAuthorId = parent.authorId;
    }

    const comment = await tx.comment.create({
      data: {
        postId,
        authorId,
        content: safeContent,
        parentId: parentId ?? null,
        guestAuthorId: guestMeta?.guestAuthorId,
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
      },
    });

    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    return {
      comment,
      postTitle: post.title,
      postAuthorId: post.authorId,
      parentAuthorId,
    };
  });

  const notificationJobs: Array<Promise<unknown>> = [];
  if (
    transactionResult.postAuthorId !== authorId &&
    transactionResult.parentAuthorId !== transactionResult.postAuthorId
  ) {
    notificationJobs.push(
      notifyCommentOnPost({
        recipientUserId: transactionResult.postAuthorId,
        actorId: authorId,
        postId,
        commentId: transactionResult.comment.id,
        postTitle: transactionResult.postTitle,
        commentContent: safeContent,
      }),
    );
  }

  if (transactionResult.parentAuthorId && transactionResult.parentAuthorId !== authorId) {
    notificationJobs.push(
      notifyReplyToComment({
        recipientUserId: transactionResult.parentAuthorId,
        actorId: authorId,
        postId,
        commentId: transactionResult.comment.id,
        postTitle: transactionResult.postTitle,
        replyContent: parsed.data.content,
      }),
    );
  }

  if (notificationJobs.length > 0) {
    const results = await Promise.allSettled(notificationJobs);
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn("댓글 알림 생성에 실패했습니다.", {
          postId,
          error: serializeError(result.reason),
        });
      }
    }
  }

  return transactionResult.comment;
}

type UpdateCommentParams = {
  commentId: string;
  authorId: string;
  input: unknown;
};

export async function updateComment({
  commentId,
  authorId,
  input,
}: UpdateCommentParams) {
  const parsed = commentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("댓글 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const [author, newUserSafetyPolicy] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true, createdAt: true },
    }),
    getNewUserSafetyPolicy(),
  ]);
  if (!author) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  const contactPolicy = moderateContactContent({
    text: parsed.data.content,
    role: author.role,
    accountCreatedAt: author.createdAt,
    blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
  });
  if (contactPolicy.blocked) {
    throw new ServiceError(
      contactPolicy.message ?? "연락처가 포함된 댓글은 현재 계정으로 수정할 수 없습니다.",
      "CONTACT_RESTRICTED_FOR_NEW_USER",
      403,
    );
  }
  const safeContent = contactPolicy.sanitizedText;
  const forbiddenKeywords = await getForbiddenKeywords();
  const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
    safeContent,
    forbiddenKeywords,
  );
  if (matchedForbiddenKeywords.length > 0) {
    throw new ServiceError(
      `금칙어가 포함되어 댓글을 수정할 수 없습니다. (${matchedForbiddenKeywords
        .slice(0, 3)
        .join(", ")})`,
      "FORBIDDEN_KEYWORD_DETECTED",
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, status: true },
    });

    if (!comment || comment.status !== PostStatus.ACTIVE) {
      throw new ServiceError("댓글을 찾을 수 없습니다.", "COMMENT_NOT_FOUND", 404);
    }

    if (comment.authorId !== authorId) {
      throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
    }

    const replyCount = await tx.comment.count({
      where: {
        parentId: commentId,
        status: PostStatus.ACTIVE,
      },
    });

    if (replyCount > 0) {
      throw new ServiceError("답글이 있으면 수정할 수 없습니다.", "HAS_REPLIES", 400);
    }

    return tx.comment.update({
      where: { id: commentId },
      data: { content: safeContent },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
      },
    });
  });
}

type DeleteCommentParams = {
  commentId: string;
  authorId: string;
};

export async function deleteComment({ commentId, authorId }: DeleteCommentParams) {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, status: true, postId: true },
    });

    if (!comment || comment.status !== PostStatus.ACTIVE) {
      throw new ServiceError("댓글을 찾을 수 없습니다.", "COMMENT_NOT_FOUND", 404);
    }

    if (comment.authorId !== authorId) {
      throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
    }

    const replyCount = await tx.comment.count({
      where: {
        parentId: commentId,
        status: PostStatus.ACTIVE,
      },
    });

    if (replyCount > 0) {
      throw new ServiceError("답글이 있으면 삭제할 수 없습니다.", "HAS_REPLIES", 400);
    }

    const deleted = await tx.comment.update({
      where: { id: commentId },
      data: { status: PostStatus.DELETED },
      select: { id: true, postId: true },
    });

    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    return deleted;
  });
}

type UpdateGuestCommentParams = {
  commentId: string;
  input: unknown;
  guestPassword: string;
  guestIdentity: {
    ip: string;
    fingerprint?: string;
  };
};

export async function updateGuestComment({
  commentId,
  input,
  guestPassword,
  guestIdentity,
}: UpdateGuestCommentParams) {
  const parsed = commentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("댓글 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const [comment, guestPostPolicy, forbiddenKeywords] = await Promise.all([
    prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        postId: true,
        status: true,
        createdAt: true,
        guestAuthorId: true,
        guestAuthor: {
          select: {
            passwordHash: true,
            ipHash: true,
            fingerprintHash: true,
          },
        },
        guestDisplayName: true,
        guestPasswordHash: true,
        guestIpHash: true,
        guestFingerprintHash: true,
        author: { select: { email: true } },
      },
    }),
    getGuestPostPolicy(),
    getForbiddenKeywords(),
  ]);

  if (!comment || comment.status !== PostStatus.ACTIVE) {
    throw new ServiceError("댓글을 찾을 수 없습니다.", "COMMENT_NOT_FOUND", 404);
  }

  const guestCredential = resolveGuestCommentCredential(comment);
  const hasGuestCredential = Boolean(guestCredential.passwordHash);
  const isLegacyGuestComment = guestCredential.hasGuestMarker && !hasGuestCredential;

  if (!hasGuestCredential && !isLegacyGuestComment) {
    throw new ServiceError("비회원 댓글이 아닙니다.", "GUEST_COMMENT_ONLY", 403);
  }

  if (
    hasGuestCredential &&
    !matchesGuestIdentity(
      {
        guestIpHash: guestCredential.ipHash,
        guestFingerprintHash: guestCredential.fingerprintHash,
      },
      guestIdentity,
    )
  ) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 댓글 수정 식별 불일치",
      source: "guest-comment-update-identity",
      policy: guestPostPolicy,
    });
    throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
  }

  const nextPasswordHash = hasGuestCredential
    ? (guestCredential.passwordHash ?? hashGuestCommentPassword(guestPassword))
    : hashGuestCommentPassword(guestPassword);
  const nextIdentityHash = hashGuestIdentity(guestIdentity);

  if (hasGuestCredential && !verifyGuestPassword(guestPassword, guestCredential.passwordHash!)) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 댓글 수정 비밀번호 실패",
      source: "guest-comment-update-password",
      policy: guestPostPolicy,
    });
    throw new ServiceError("비밀번호가 일치하지 않습니다.", "INVALID_GUEST_PASSWORD", 403);
  }

  if (isLegacyGuestComment && !isLegacyGuestCommentClaimable(comment.createdAt)) {
    throw new ServiceError(
      "기존 비회원 댓글은 작성 후 24시간 이내에만 비밀번호 등록으로 수정할 수 있습니다.",
      "LEGACY_GUEST_COMMENT_CLAIM_EXPIRED",
      403,
    );
  }

  const replyCountByOthers = await prisma.comment.count({
    where: {
      parentId: commentId,
      status: PostStatus.ACTIVE,
    },
  });
  if (replyCountByOthers > 0) {
    throw new ServiceError("답글이 있으면 수정할 수 없습니다.", "HAS_REPLIES", 400);
  }

  const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
    parsed.data.content,
    forbiddenKeywords,
  );
  if (matchedForbiddenKeywords.length > 0) {
    throw new ServiceError(
      `금칙어가 포함되어 댓글을 수정할 수 없습니다. (${matchedForbiddenKeywords
        .slice(0, 3)
        .join(", ")})`,
      "FORBIDDEN_KEYWORD_DETECTED",
      400,
    );
  }

  const contactSignals = moderateContactContent({
    text: parsed.data.content,
    role: "USER",
    accountCreatedAt: new Date(),
    blockWindowHours: 24,
  });
  if (contactSignals.blocked || (!guestPostPolicy.allowContact && contactSignals.sanitizedText !== parsed.data.content)) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.SPAM,
      reason: "비회원 댓글 수정 연락처 위반",
      source: "guest-comment-update-contact",
      policy: guestPostPolicy,
    });
    throw new ServiceError("비회원 댓글에는 연락처를 포함할 수 없습니다.", "GUEST_CONTACT_BLOCKED", 403);
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: {
      content: parsed.data.content,
      ...(isLegacyGuestComment
        ? {
            guestAuthor: {
              create: {
                displayName: comment.guestDisplayName?.trim() || "익명",
                passwordHash: nextPasswordHash,
                ipHash: nextIdentityHash.ipHash,
                fingerprintHash: nextIdentityHash.fingerprintHash,
              },
            },
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, nickname: true } },
    },
  });
}

type DeleteGuestCommentParams = {
  commentId: string;
  guestPassword: string;
  guestIdentity: {
    ip: string;
    fingerprint?: string;
  };
};

export async function deleteGuestComment({
  commentId,
  guestPassword,
  guestIdentity,
}: DeleteGuestCommentParams) {
  const [comment, guestPostPolicy] = await Promise.all([
    prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        postId: true,
        status: true,
        createdAt: true,
        guestAuthorId: true,
        guestAuthor: {
          select: {
            passwordHash: true,
            ipHash: true,
            fingerprintHash: true,
          },
        },
        guestDisplayName: true,
        guestPasswordHash: true,
        guestIpHash: true,
        guestFingerprintHash: true,
        author: { select: { email: true } },
      },
    }),
    getGuestPostPolicy(),
  ]);

  if (!comment || comment.status !== PostStatus.ACTIVE) {
    throw new ServiceError("댓글을 찾을 수 없습니다.", "COMMENT_NOT_FOUND", 404);
  }

  const guestCredential = resolveGuestCommentCredential(comment);
  const hasGuestCredential = Boolean(guestCredential.passwordHash);
  const isLegacyGuestComment = guestCredential.hasGuestMarker && !hasGuestCredential;

  if (!hasGuestCredential && !isLegacyGuestComment) {
    throw new ServiceError("비회원 댓글이 아닙니다.", "GUEST_COMMENT_ONLY", 403);
  }

  if (
    hasGuestCredential &&
    !matchesGuestIdentity(
      {
        guestIpHash: guestCredential.ipHash,
        guestFingerprintHash: guestCredential.fingerprintHash,
      },
      guestIdentity,
    )
  ) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 댓글 삭제 식별 불일치",
      source: "guest-comment-delete-identity",
      policy: guestPostPolicy,
    });
    throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (hasGuestCredential && !verifyGuestPassword(guestPassword, guestCredential.passwordHash!)) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 댓글 삭제 비밀번호 실패",
      source: "guest-comment-delete-password",
      policy: guestPostPolicy,
    });
    throw new ServiceError("비밀번호가 일치하지 않습니다.", "INVALID_GUEST_PASSWORD", 403);
  }

  if (isLegacyGuestComment && !isLegacyGuestCommentClaimable(comment.createdAt)) {
    throw new ServiceError(
      "기존 비회원 댓글은 작성 후 24시간 이내에만 비밀번호 등록으로 삭제할 수 있습니다.",
      "LEGACY_GUEST_COMMENT_CLAIM_EXPIRED",
      403,
    );
  }

  const replyCountByOthers = await prisma.comment.count({
    where: {
      parentId: commentId,
      status: PostStatus.ACTIVE,
    },
  });
  if (replyCountByOthers > 0) {
    throw new ServiceError("답글이 있으면 삭제할 수 없습니다.", "HAS_REPLIES", 400);
  }

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.comment.update({
      where: { id: commentId },
      data: { status: PostStatus.DELETED },
      select: { id: true, postId: true },
    });

    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    return deleted;
  });
}

type ToggleCommentReactionParams = {
  commentId: string;
  userId: string;
  type: CommentReactionType;
};

type ToggleCommentReactionResult = {
  commentId: string;
  reaction: CommentReactionType | null;
  likeCount: number;
  dislikeCount: number;
};

export async function toggleCommentReaction({
  commentId,
  userId,
  type,
}: ToggleCommentReactionParams): Promise<ToggleCommentReactionResult> {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: { id: true, status: true, authorId: true },
    });

    if (!comment || comment.status !== PostStatus.ACTIVE) {
      throw new ServiceError("댓글을 찾을 수 없습니다.", "COMMENT_NOT_FOUND", 404);
    }

    if (await hasBlockingRelation(userId, comment.authorId)) {
      throw new ServiceError(
        "차단 관계에서는 반응할 수 없습니다.",
        "USER_BLOCK_RELATION",
        403,
      );
    }

    const existing = await tx.commentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
      select: { id: true, type: true },
    });

    let reaction: CommentReactionType | null = type;

    if (existing) {
      if (existing.type === type) {
        await tx.commentReaction.delete({ where: { id: existing.id } });
        reaction = null;
      } else {
        await tx.commentReaction.update({
          where: { id: existing.id },
          data: { type },
        });
      }
    } else {
      await tx.commentReaction.create({
        data: {
          commentId,
          userId,
          type,
        },
      });
    }

    const [likeCount, dislikeCount] = await Promise.all([
      tx.commentReaction.count({
        where: { commentId, type: CommentReactionType.LIKE },
      }),
      tx.commentReaction.count({
        where: { commentId, type: CommentReactionType.DISLIKE },
      }),
    ]);

    await tx.comment.update({
      where: { id: commentId },
      data: {
        likeCount,
        dislikeCount,
      },
    });

    return {
      commentId,
      reaction,
      likeCount,
      dislikeCount,
    };
  });
}
