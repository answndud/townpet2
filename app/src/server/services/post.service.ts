import { GuestViolationCategory, PostReactionType, PostScope, PostStatus } from "@prisma/client";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";

import { runtimeEnv } from "@/lib/env";
import { findMatchedForbiddenKeywords } from "@/lib/forbidden-keyword-policy";
import { prisma } from "@/lib/prisma";
import { detectContactSignals, moderateContactContent } from "@/lib/contact-policy";
import { buildGuestIpMeta } from "@/lib/guest-ip-display";
import { isGuestPostTypeBlocked, isGuestScopeAllowed } from "@/lib/guest-post-policy";
import { evaluateNewUserPostWritePolicy } from "@/lib/post-write-policy";
import {
  hospitalReviewSchema,
  placeReviewSchema,
  postCreateSchema,
  postUpdateSchema,
  walkRouteSchema,
} from "@/lib/validations/post";
import { logger, serializeError } from "@/server/logger";
import {
  getForbiddenKeywords,
  getGuestPostPolicy,
  getNewUserSafetyPolicy,
} from "@/server/queries/policy.queries";
import { hasBlockingRelation } from "@/server/queries/user-relation.queries";
import {
  assertGuestNotBanned,
  hashGuestIdentity,
  registerGuestViolation,
} from "@/server/services/guest-safety.service";
import { getOrCreateGuestSystemUserId } from "@/server/services/guest-author.service";
import { notifyReactionOnPost } from "@/server/services/notification.service";
import { ServiceError } from "@/server/services/service-error";

type CreatePostParams = {
  authorId?: string;
  input: unknown;
  guestIdentity?: {
    ip: string;
    fingerprint?: string;
    userAgent?: string;
  };
};

const MAX_POST_IMAGES = 10;
const GUEST_LINK_PATTERN = /https?:\/\/[\S]+/i;
const GUEST_IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*\]\(([^)\s]+)\)(?:\{\s*width\s*=\s*\d{2,4}\s*\})?/gi;
const POST_VIEW_TTL_SECONDS = 60 * 60 * 6;
const postViewStore = new Map<string, number>();
let postViewRedisFailureLoggedAt = 0;

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

const hasAnyValue = (data: Record<string, unknown>) =>
  Object.values(data).some((value) => hasValue(value));

const normalizeImageUrls = (imageUrls: string[] | undefined) =>
  Array.from(
    new Set(
      (imageUrls ?? [])
        .map((url) => url.trim())
        .filter((url) => url.length > 0),
    ),
  ).slice(0, MAX_POST_IMAGES);

const buildImageCreateInput = (imageUrls: string[]) =>
  imageUrls.map((url, index) => ({
    url,
    order: index,
  }));

function stripImageTokensForGuestPolicy(value: string) {
  return value.replace(GUEST_IMAGE_MARKDOWN_PATTERN, " ").replace(/\s+/g, " ").trim();
}

function hashGuestPassword(rawPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(rawPassword, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

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

function resolveGuestPostCredential(params: {
  guestAuthorId?: string | null;
  guestAuthor?: {
    passwordHash: string;
    ipHash: string;
    fingerprintHash: string | null;
  } | null;
}) {
  return {
    hasGuestMarker: Boolean(params.guestAuthorId || params.guestAuthor),
    passwordHash: params.guestAuthor?.passwordHash ?? null,
    ipHash: params.guestAuthor?.ipHash ?? null,
    fingerprintHash: params.guestAuthor?.fingerprintHash ?? null,
  };
}

type RegisterPostViewParams = {
  postId: string;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
  ttlSeconds?: number;
};

function buildPostViewFingerprint({
  postId,
  userId,
  clientIp,
  userAgent,
}: RegisterPostViewParams) {
  return createHash("sha256")
    .update(
      `${postId}:${userId ?? "anonymous"}:${clientIp ?? "anonymous"}:${(userAgent ?? "unknown").slice(0, 120)}`,
    )
    .digest("hex");
}

function reserveMemoryPostView(fingerprint: string, ttlMs: number) {
  const now = Date.now();
  const expiresAt = postViewStore.get(fingerprint);
  if (expiresAt && expiresAt > now) {
    return false;
  }

  postViewStore.set(fingerprint, now + ttlMs);

  if (postViewStore.size > 5_000) {
    for (const [key, expireAt] of postViewStore.entries()) {
      if (expireAt <= now) {
        postViewStore.delete(key);
      }
    }
  }

  return true;
}

async function reserveRedisPostView(fingerprint: string, ttlSeconds: number) {
  const endpoint = `${runtimeEnv.upstashRedisRestUrl}/pipeline`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeEnv.upstashRedisRestToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["SET", `postview:${fingerprint}`, "1", "NX", "EX", ttlSeconds],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash post view request failed: ${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    result?: string | null;
    error?: string;
  }>;

  const commandError = payload.find((item) => item.error);
  if (commandError) {
    throw new Error(`Upstash command error: ${commandError.error}`);
  }

  return payload[0]?.result === "OK";
}

async function reservePostView(fingerprint: string, ttlSeconds: number) {
  if (runtimeEnv.isUpstashConfigured) {
    try {
      return await reserveRedisPostView(fingerprint, ttlSeconds);
    } catch (error) {
      const now = Date.now();
      if (now - postViewRedisFailureLoggedAt > 60_000) {
        postViewRedisFailureLoggedAt = now;
        logger.warn("Redis post view dedupe 실패로 메모리 fallback을 사용합니다.", {
          error: serializeError(error),
        });
      }
    }
  }

  return reserveMemoryPostView(fingerprint, ttlSeconds * 1000);
}

export async function registerPostView({
  postId,
  userId,
  clientIp,
  userAgent,
  ttlSeconds = POST_VIEW_TTL_SECONDS,
}: RegisterPostViewParams) {
  try {
    const fingerprint = buildPostViewFingerprint({
      postId,
      userId,
      clientIp,
      userAgent,
    });
    const shouldCount = await reservePostView(fingerprint, ttlSeconds);
    if (!shouldCount) {
      return false;
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: { increment: 1 },
      },
    });

    return true;
  } catch (error) {
    logger.warn("게시글 조회수 집계에 실패했습니다.", {
      postId,
      error: serializeError(error),
    });
    return false;
  }
}

export async function createPost({ authorId, input, guestIdentity }: CreatePostParams) {
  const parsed = postCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const {
    imageUrls,
    guestDisplayName,
    guestPassword,
    ...postData
  } = parsed.data;
  const normalizedImageUrls = normalizeImageUrls(imageUrls);
  const rawInput = input as Record<string, unknown>;
  const [forbiddenKeywords, newUserSafetyPolicy, guestPostPolicy] = await Promise.all([
    getForbiddenKeywords(),
    getNewUserSafetyPolicy(),
    getGuestPostPolicy(),
  ]);
  const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
    `${postData.title}\n${postData.content}`,
    forbiddenKeywords,
  );
  if (matchedForbiddenKeywords.length > 0) {
    if (guestIdentity) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.POLICY,
        reason: "금칙어 반복 위반",
        source: "post-forbidden-keyword",
        policy: guestPostPolicy,
      });
    }
    throw new ServiceError(
      `금칙어가 포함되어 게시글을 저장할 수 없습니다. (${matchedForbiddenKeywords
        .slice(0, 3)
        .join(", ")})`,
      "FORBIDDEN_KEYWORD_DETECTED",
      400,
    );
  }

  let resolvedAuthorId: string;
  let guestCreateMeta:
    | {
        guestAuthorId: string;
      }
    | undefined;

  if (authorId) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true, createdAt: true },
    });
    if (!author) {
      throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
    }

    const writePolicy = evaluateNewUserPostWritePolicy({
      role: author.role,
      accountCreatedAt: author.createdAt,
      postType: postData.type,
      minAccountAgeHours: newUserSafetyPolicy.minAccountAgeHours,
      restrictedTypes: newUserSafetyPolicy.restrictedPostTypes,
    });
    if (!writePolicy.allowed) {
      throw new ServiceError(
        writePolicy.message ?? "현재 계정으로는 이 카테고리 글을 작성할 수 없습니다.",
        "NEW_USER_RESTRICTED_TYPE",
        403,
      );
    }

    const contactPolicy = moderateContactContent({
      text: postData.content,
      role: author.role,
      accountCreatedAt: author.createdAt,
      blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 내용은 현재 계정으로 작성할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }
    postData.content = contactPolicy.sanitizedText;
    resolvedAuthorId = author.id;
  } else {
    if (!guestIdentity) {
      throw new ServiceError("비회원 식별 정보가 필요합니다.", "INVALID_GUEST_CONTEXT", 400);
    }

    await assertGuestNotBanned(guestIdentity);

    const normalizedGuestName = guestDisplayName?.trim();
    const normalizedGuestPassword = guestPassword?.trim();
    if (!normalizedGuestName || !normalizedGuestPassword) {
      throw new ServiceError("비회원 닉네임과 비밀번호를 입력해 주세요.", "GUEST_AUTH_REQUIRED", 400);
    }

    if (isGuestPostTypeBlocked(postData.type, guestPostPolicy.blockedPostTypes)) {
      throw new ServiceError(
        "비회원은 해당 카테고리 글을 작성할 수 없습니다.",
        "GUEST_RESTRICTED_TYPE",
        403,
      );
    }

    if (!isGuestScopeAllowed(postData.scope, guestPostPolicy.enforceGlobalScope)) {
      throw new ServiceError(
        "비회원은 온동네(글로벌) 글만 작성할 수 있습니다.",
        "GUEST_SCOPE_RESTRICTED",
        403,
      );
    }

    if (normalizedImageUrls.length > guestPostPolicy.maxImageCount) {
      throw new ServiceError(
        `비회원은 이미지를 최대 ${guestPostPolicy.maxImageCount}장까지 첨부할 수 있습니다.`,
        "GUEST_IMAGE_LIMIT_EXCEEDED",
        400,
      );
    }

    const guestPolicyText = stripImageTokensForGuestPolicy(postData.content);

    if (!guestPostPolicy.allowLinks && GUEST_LINK_PATTERN.test(guestPolicyText)) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "외부 링크 반복 게시",
        source: "post-link",
        policy: guestPostPolicy,
      });
      throw new ServiceError("비회원 글에서는 외부 링크를 포함할 수 없습니다.", "GUEST_LINK_BLOCKED", 403);
    }

    if (!guestPostPolicy.allowContact && detectContactSignals(guestPolicyText).length > 0) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "연락처/외부 연락 유도 반복",
        source: "post-contact",
        policy: guestPostPolicy,
      });
      throw new ServiceError(
        "비회원 글에서는 연락처/외부 연락 수단을 포함할 수 없습니다.",
        "GUEST_CONTACT_BLOCKED",
        403,
      );
    }

    const { ipHash, fingerprintHash } = hashGuestIdentity(guestIdentity);
    const guestIpMeta = buildGuestIpMeta({
      ip: guestIdentity.ip,
      fingerprint: guestIdentity.fingerprint,
      userAgent: guestIdentity.userAgent,
    });
    const guestSystemUserId = await getOrCreateGuestSystemUserId();
    const guestAuthor = await prisma.guestAuthor.create({
      data: {
        displayName: normalizedGuestName,
        passwordHash: hashGuestPassword(normalizedGuestPassword),
        ipHash,
        fingerprintHash,
        ipDisplay: guestIpMeta.guestIpDisplay,
        ipLabel: guestIpMeta.guestIpLabel,
      },
      select: { id: true },
    });
    resolvedAuthorId = guestSystemUserId;
    guestCreateMeta = {
      guestAuthorId: guestAuthor.id,
    };
  }

  if (postData.scope === PostScope.LOCAL && !postData.neighborhoodId) {
    throw new ServiceError("동네 정보가 필요합니다.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  const commonCreateData = {
    ...postData,
    authorId: resolvedAuthorId,
    ...(guestCreateMeta ?? {}),
    ...(normalizedImageUrls.length > 0
      ? {
          images: {
            create: buildImageCreateInput(normalizedImageUrls),
          },
        }
      : {}),
  };

  if (postData.type === "HOSPITAL_REVIEW") {
    const reviewInput = hospitalReviewSchema.safeParse(rawInput.hospitalReview ?? {});
    if (!reviewInput.success) {
      throw new ServiceError("병원 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(reviewInput.data);

    return prisma.post.create({
      data: {
        ...commonCreateData,
        ...(shouldCreateReview
          ? {
              hospitalReview: {
                create: {
                  ...reviewInput.data,
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
            rating: true,
          },
        },
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  if (postData.type === "PLACE_REVIEW") {
    const reviewInput = placeReviewSchema.safeParse(rawInput.placeReview ?? {});
    if (!reviewInput.success) {
      throw new ServiceError("장소 리뷰 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(reviewInput.data);

    return prisma.post.create({
      data: {
        ...commonCreateData,
        ...(shouldCreateReview
          ? {
              placeReview: {
                create: {
                  ...reviewInput.data,
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
            rating: true,
          },
        },
        placeReview: {
          select: {
            placeName: true,
            placeType: true,
            address: true,
            isPetAllowed: true,
            rating: true,
          },
        },
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  if (postData.type === "WALK_ROUTE") {
    const routeInput = walkRouteSchema.safeParse(rawInput.walkRoute ?? {});
    if (!routeInput.success) {
      throw new ServiceError("산책로 입력값이 올바르지 않습니다.", "INVALID_REVIEW", 400);
    }

    const shouldCreateReview = hasAnyValue(routeInput.data);

    return prisma.post.create({
      data: {
        ...commonCreateData,
        ...(shouldCreateReview
          ? {
              walkRoute: {
                create: {
                  ...routeInput.data,
                  coordinates: [],
                  safetyTags: routeInput.data.safetyTags ?? [],
                },
              },
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, nickname: true } },
        neighborhood: {
          select: { id: true, name: true, city: true, district: true },
        },
        hospitalReview: {
          select: {
            hospitalName: true,
            totalCost: true,
            waitTime: true,
            rating: true,
          },
        },
        placeReview: {
          select: {
            placeName: true,
            placeType: true,
            address: true,
            isPetAllowed: true,
            rating: true,
          },
        },
        walkRoute: {
          select: {
            routeName: true,
            distance: true,
            duration: true,
            difficulty: true,
            hasStreetLights: true,
            hasRestroom: true,
            hasParkingLot: true,
            safetyTags: true,
          },
        },
        images: {
          select: { id: true, url: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  return prisma.post.create({
    data: {
      ...commonCreateData,
    },
    include: {
      author: { select: { id: true, name: true, nickname: true } },
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      hospitalReview: {
        select: {
          hospitalName: true,
          totalCost: true,
          waitTime: true,
          rating: true,
        },
      },
      placeReview: {
        select: {
          placeName: true,
          placeType: true,
          address: true,
          isPetAllowed: true,
          rating: true,
        },
      },
      walkRoute: {
        select: {
          routeName: true,
          distance: true,
          duration: true,
          difficulty: true,
          hasStreetLights: true,
          hasRestroom: true,
          hasParkingLot: true,
          safetyTags: true,
        },
      },
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
}

type UpdatePostParams = {
  postId: string;
  authorId: string;
  input: unknown;
};

export async function updatePost({ postId, authorId, input }: UpdatePostParams) {
  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  if (parsed.data.scope === PostScope.LOCAL && !parsed.data.neighborhoodId) {
    throw new ServiceError("동네 정보가 필요합니다.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  const normalizedImageUrls = normalizeImageUrls(parsed.data.imageUrls);
  const { imageUrls, ...postData } = parsed.data;

  if (postData.content !== undefined) {
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
      text: postData.content,
      role: author.role,
      accountCreatedAt: author.createdAt,
      blockWindowHours: newUserSafetyPolicy.contactBlockWindowHours,
    });
    if (contactPolicy.blocked) {
      throw new ServiceError(
        contactPolicy.message ?? "연락처가 포함된 내용은 현재 계정으로 수정할 수 없습니다.",
        "CONTACT_RESTRICTED_FOR_NEW_USER",
        403,
      );
    }
    postData.content = contactPolicy.sanitizedText;
  }

  if (postData.title !== undefined || postData.content !== undefined) {
    const forbiddenKeywords = await getForbiddenKeywords();
    const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
      `${postData.title ?? ""}\n${postData.content ?? ""}`,
      forbiddenKeywords,
    );
    if (matchedForbiddenKeywords.length > 0) {
      throw new ServiceError(
        `금칙어가 포함되어 게시글을 수정할 수 없습니다. (${matchedForbiddenKeywords
          .slice(0, 3)
          .join(", ")})`,
        "FORBIDDEN_KEYWORD_DETECTED",
        400,
      );
    }
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.authorId !== authorId) {
    throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
  }

  return prisma.post.update({
    where: { id: postId },
    data: {
      ...postData,
      neighborhoodId:
        postData.scope === PostScope.GLOBAL ? null : postData.neighborhoodId,
      ...(imageUrls
        ? {
            images: {
              deleteMany: {},
              create: buildImageCreateInput(normalizedImageUrls),
            },
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, nickname: true } },
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      hospitalReview: {
        select: {
          hospitalName: true,
          totalCost: true,
          waitTime: true,
          rating: true,
        },
      },
      placeReview: {
        select: {
          placeName: true,
          placeType: true,
          address: true,
          isPetAllowed: true,
          rating: true,
        },
      },
      walkRoute: {
        select: {
          routeName: true,
          distance: true,
          duration: true,
          difficulty: true,
          hasStreetLights: true,
          hasRestroom: true,
          hasParkingLot: true,
          safetyTags: true,
        },
      },
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
}

type DeletePostParams = {
  postId: string;
  authorId: string;
};

export async function deletePost({ postId, authorId }: DeletePostParams) {
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.authorId !== authorId) {
    throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
  }

  return prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.DELETED },
    select: { id: true, status: true },
  });
}

type UpdateGuestPostParams = {
  postId: string;
  input: unknown;
  guestPassword: string;
  guestIdentity: {
    ip: string;
    fingerprint?: string;
  };
};

export async function updateGuestPost({
  postId,
  input,
  guestPassword,
  guestIdentity,
}: UpdateGuestPostParams) {
  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      guestAuthorId: true,
      guestAuthor: {
        select: {
          passwordHash: true,
          ipHash: true,
          fingerprintHash: true,
        },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  const guestCredential = resolveGuestPostCredential(existing);

  if (!guestCredential.hasGuestMarker || !guestCredential.passwordHash) {
    throw new ServiceError("비회원 게시글이 아닙니다.", "GUEST_POST_ONLY", 403);
  }

  if (
    !matchesGuestIdentity(
      {
        guestIpHash: guestCredential.ipHash,
        guestFingerprintHash: guestCredential.fingerprintHash,
      },
      guestIdentity,
    )
  ) {
    const guestPostPolicy = await getGuestPostPolicy();
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 글 수정 시도 식별 불일치",
      source: "guest-update-identity-mismatch",
      policy: guestPostPolicy,
    });
    throw new ServiceError("수정 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (!verifyGuestPassword(guestPassword, guestCredential.passwordHash)) {
    const guestPostPolicy = await getGuestPostPolicy();
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 글 수정 비밀번호 실패",
      source: "guest-update-password-failed",
      policy: guestPostPolicy,
    });
    throw new ServiceError("비밀번호가 일치하지 않습니다.", "INVALID_GUEST_PASSWORD", 403);
  }

  const guestPostPolicy = await getGuestPostPolicy();
  if (parsed.data.scope && parsed.data.scope !== PostScope.GLOBAL) {
    throw new ServiceError("비회원 게시글은 온동네 범위만 허용됩니다.", "GUEST_SCOPE_RESTRICTED", 403);
  }

  const normalizedImageUrls = normalizeImageUrls(parsed.data.imageUrls);
  if (parsed.data.imageUrls && normalizedImageUrls.length > guestPostPolicy.maxImageCount) {
    throw new ServiceError(
      `비회원은 이미지를 최대 ${guestPostPolicy.maxImageCount}장까지 첨부할 수 있습니다.`,
      "GUEST_IMAGE_LIMIT_EXCEEDED",
      400,
    );
  }

  const postData = { ...parsed.data };
  if (postData.content !== undefined) {
    const guestPolicyText = stripImageTokensForGuestPolicy(postData.content);

    if (!guestPostPolicy.allowLinks && GUEST_LINK_PATTERN.test(guestPolicyText)) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "비회원 글 수정 링크 위반",
        source: "guest-update-link",
        policy: guestPostPolicy,
      });
      throw new ServiceError("비회원 글에서는 외부 링크를 포함할 수 없습니다.", "GUEST_LINK_BLOCKED", 403);
    }

    if (!guestPostPolicy.allowContact && detectContactSignals(guestPolicyText).length > 0) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.SPAM,
        reason: "비회원 글 수정 연락처 위반",
        source: "guest-update-contact",
        policy: guestPostPolicy,
      });
      throw new ServiceError(
        "비회원 글에서는 연락처/외부 연락 수단을 포함할 수 없습니다.",
        "GUEST_CONTACT_BLOCKED",
        403,
      );
    }
  }

  if (postData.title !== undefined || postData.content !== undefined) {
    const forbiddenKeywords = await getForbiddenKeywords();
    const matchedForbiddenKeywords = findMatchedForbiddenKeywords(
      `${postData.title ?? ""}\n${postData.content ?? ""}`,
      forbiddenKeywords,
    );
    if (matchedForbiddenKeywords.length > 0) {
      await registerGuestViolation({
        identity: guestIdentity,
        category: GuestViolationCategory.POLICY,
        reason: "비회원 글 수정 금칙어 위반",
        source: "guest-update-forbidden-keyword",
        policy: guestPostPolicy,
      });
      throw new ServiceError(
        `금칙어가 포함되어 게시글을 수정할 수 없습니다. (${matchedForbiddenKeywords
          .slice(0, 3)
          .join(", ")})`,
        "FORBIDDEN_KEYWORD_DETECTED",
        400,
      );
    }
  }

  const { imageUrls, ...restData } = postData;

  return prisma.post.update({
    where: { id: postId },
    data: {
      ...restData,
      scope: PostScope.GLOBAL,
      neighborhoodId: null,
      ...(imageUrls
        ? {
            images: {
              deleteMany: {},
              create: buildImageCreateInput(normalizedImageUrls),
            },
          }
        : {}),
    },
    include: {
      author: { select: { id: true, name: true, nickname: true } },
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      hospitalReview: {
        select: {
          hospitalName: true,
          totalCost: true,
          waitTime: true,
          rating: true,
        },
      },
      placeReview: {
        select: {
          placeName: true,
          placeType: true,
          address: true,
          isPetAllowed: true,
          rating: true,
        },
      },
      walkRoute: {
        select: {
          routeName: true,
          distance: true,
          duration: true,
          difficulty: true,
          hasStreetLights: true,
          hasRestroom: true,
          hasParkingLot: true,
          safetyTags: true,
        },
      },
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });
}

type DeleteGuestPostParams = {
  postId: string;
  guestPassword: string;
  guestIdentity: {
    ip: string;
    fingerprint?: string;
  };
};

export async function deleteGuestPost({
  postId,
  guestPassword,
  guestIdentity,
}: DeleteGuestPostParams) {
  const guestPostPolicy = await getGuestPostPolicy();
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      guestAuthorId: true,
      guestAuthor: {
        select: {
          passwordHash: true,
          ipHash: true,
          fingerprintHash: true,
        },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  const guestCredential = resolveGuestPostCredential(existing);

  if (!guestCredential.hasGuestMarker || !guestCredential.passwordHash) {
    throw new ServiceError("비회원 게시글이 아닙니다.", "GUEST_POST_ONLY", 403);
  }

  if (
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
      reason: "비회원 글 삭제 시도 식별 불일치",
      source: "guest-delete-identity-mismatch",
      policy: guestPostPolicy,
    });
    throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (!verifyGuestPassword(guestPassword, guestCredential.passwordHash)) {
    await registerGuestViolation({
      identity: guestIdentity,
      category: GuestViolationCategory.POLICY,
      reason: "비회원 글 삭제 비밀번호 실패",
      source: "guest-delete-password-failed",
      policy: guestPostPolicy,
    });
    throw new ServiceError("비밀번호가 일치하지 않습니다.", "INVALID_GUEST_PASSWORD", 403);
  }

  return prisma.post.update({
    where: { id: postId },
    data: { status: PostStatus.DELETED },
    select: { id: true, status: true },
  });
}

type TogglePostReactionParams = {
  postId: string;
  userId: string;
  type: PostReactionType;
};

type TogglePostReactionResult = {
  likeCount: number;
  dislikeCount: number;
  reaction: PostReactionType | null;
};

type ReactionDelegateLike = {
  findUnique: (args: {
    where: { postId_userId: { postId: string; userId: string } };
    select: { id: true; type: true };
  }) => Promise<{ id: string; type: PostReactionType } | null>;
  create: (args: {
    data: { postId: string; userId: string; type: PostReactionType };
  }) => Promise<unknown>;
  update: (args: {
    where: { id: string };
    data: { type: PostReactionType };
  }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  count: (args: { where: { postId: string; type: PostReactionType } }) => Promise<number>;
};

type TxLike = {
  post: {
    update: (args: {
      where: { id: string };
      data: { likeCount: number; dislikeCount: number };
    }) => Promise<unknown>;
  };
  postReaction?: ReactionDelegateLike;
  $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
};

function hasReactionDelegate(
  delegate: TxLike["postReaction"],
): delegate is ReactionDelegateLike {
  return Boolean(
    delegate &&
      typeof delegate.findUnique === "function" &&
      typeof delegate.create === "function" &&
      typeof delegate.update === "function" &&
      typeof delegate.delete === "function" &&
      typeof delegate.count === "function",
  );
}

async function togglePostReactionWithRawSql({
  tx,
  postId,
  userId,
  type,
}: {
  tx: TxLike;
  postId: string;
  userId: string;
  type: PostReactionType;
}): Promise<TogglePostReactionResult> {
  const now = new Date();
  const existingRows = await tx.$queryRaw<Array<{ id: string; type: string }>>`
    SELECT id, "type"::text AS type
    FROM "PostReaction"
    WHERE "postId" = ${postId} AND "userId" = ${userId}
    LIMIT 1
  `;
  const existingRow = existingRows[0];

  let reaction: PostReactionType | null = type;

  if (existingRow && existingRow.type === type) {
    await tx.$executeRaw`
      DELETE FROM "PostReaction"
      WHERE id = ${existingRow.id}
    `;
    reaction = null;
  } else if (existingRow) {
    await tx.$executeRaw`
      UPDATE "PostReaction"
      SET "type" = ${type}::"PostReactionType", "updatedAt" = ${now}
      WHERE id = ${existingRow.id}
    `;
  } else {
    const reactionId = randomUUID().replace(/-/g, "");
    await tx.$executeRaw`
      INSERT INTO "PostReaction" ("id", "postId", "userId", "type", "createdAt", "updatedAt")
      VALUES (${reactionId}, ${postId}, ${userId}, ${type}::"PostReactionType", ${now}, ${now})
    `;
  }

  const likeCountRows = await tx.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "PostReaction"
    WHERE "postId" = ${postId} AND "type" = 'LIKE'::"PostReactionType"
  `;
  const dislikeCountRows = await tx.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "PostReaction"
    WHERE "postId" = ${postId} AND "type" = 'DISLIKE'::"PostReactionType"
  `;

  const likeCount = Number(likeCountRows[0]?.count ?? 0);
  const dislikeCount = Number(dislikeCountRows[0]?.count ?? 0);

  await tx.post.update({
    where: { id: postId },
    data: {
      likeCount,
      dislikeCount,
    },
  });

  return { likeCount, dislikeCount, reaction };
}

export async function togglePostReaction({
  postId,
  userId,
  type,
}: TogglePostReactionParams): Promise<TogglePostReactionResult> {
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true, title: true },
  });

  if (!existingPost || existingPost.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (await hasBlockingRelation(userId, existingPost.authorId)) {
    throw new ServiceError(
      "차단 관계에서는 반응할 수 없습니다.",
      "USER_BLOCK_RELATION",
      403,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const txLike = tx as unknown as TxLike;
    const reactionDelegate = txLike.postReaction;

    if (!hasReactionDelegate(reactionDelegate)) {
      logger.warn(
        "Prisma tx.postReaction delegate가 불완전하여 raw SQL fallback으로 반응을 처리합니다.",
        { postId },
      );
      return togglePostReactionWithRawSql({ tx: txLike, postId, userId, type });
    }

    const existingReaction = await reactionDelegate.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      select: { id: true, type: true },
    });

    let reaction: PostReactionType | null = type;

    if (existingReaction?.type === type) {
      await reactionDelegate.delete({
        where: { id: existingReaction.id },
      });
      reaction = null;
    } else if (existingReaction) {
      await reactionDelegate.update({
        where: { id: existingReaction.id },
        data: { type },
      });
    } else {
      await reactionDelegate.create({
        data: {
          postId,
          userId,
          type,
        },
      });
    }

    const [likeCount, dislikeCount] = await Promise.all([
      reactionDelegate.count({
        where: { postId, type: PostReactionType.LIKE },
      }),
      reactionDelegate.count({
        where: { postId, type: PostReactionType.DISLIKE },
      }),
    ]);

    await txLike.post.update({
      where: { id: postId },
      data: {
        likeCount,
        dislikeCount,
      },
    });

    return { likeCount, dislikeCount, reaction };
  });

  if (
    result.reaction === PostReactionType.LIKE &&
    existingPost.authorId !== userId
  ) {
    try {
      await notifyReactionOnPost({
        recipientUserId: existingPost.authorId,
        actorId: userId,
        postId: existingPost.id,
        postTitle: existingPost.title,
      });
    } catch (error) {
      logger.warn("게시글 반응 알림 생성에 실패했습니다.", {
        postId,
        userId,
        error: serializeError(error),
      });
    }
  }

  return result;
}
