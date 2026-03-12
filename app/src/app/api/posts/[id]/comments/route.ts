import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { buildGuestIpMeta } from "@/lib/guest-ip-display";
import { getCurrentUserIdFromRequest, getCurrentUserRole } from "@/server/auth";
import { enforceAuthenticatedWriteRateLimit } from "@/server/authenticated-write-throttle";
import { monitorUnhandledError } from "@/server/error-monitor";
import { assertGuestStepUp } from "@/server/guest-step-up";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { listComments } from "@/server/queries/comment.queries";
import { getPostReadAccessById } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import {
  createComment,
  hashGuestCommentPassword,
} from "@/server/services/comment.service";
import {
  createGuestAuthor,
  getOrCreateGuestSystemUserId,
} from "@/server/services/guest-author.service";
import { hashGuestIdentity } from "@/server/services/guest-safety.service";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const forceGuestMode = request.headers.get("x-guest-mode") === "1";
    const userId = forceGuestMode ? null : await getCurrentUserIdFromRequest(request);
    const viewerId = userId ?? undefined;
    const viewerRole =
      userId && !forceGuestMode ? (await getCurrentUserRole())?.role ?? null : null;
    const requestUrl = new URL(request.url);
    const pageParam = Number(requestUrl.searchParams.get("page") ?? "1");
    const limitParam = Number(requestUrl.searchParams.get("limit") ?? "30");
    const post = await getPostReadAccessById(postId, viewerId);
    if (!post) {
      return jsonError(404, {
        code: "POST_NOT_FOUND",
        message: "게시물을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, viewerId, {
      viewerRole,
      allowModeratorHiddenRead:
        viewerRole === UserRole.ADMIN || viewerRole === UserRole.MODERATOR,
    });

    const comments = await listComments(postId, viewerId, {
      page: Number.isFinite(pageParam) ? pageParam : 1,
      limit: Number.isFinite(limitParam) ? limitParam : 30,
    });
    return jsonOk(comments, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "GET /api/posts/[id]/comments", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const body = (await request.json()) as {
      content?: string;
      parentId?: string;
      guestDisplayName?: string;
      guestPassword?: string;
    };

    const forceGuestMode =
      process.env.NODE_ENV !== "production" && request.headers.get("x-guest-mode") === "1";
    const userId = forceGuestMode ? null : await getCurrentUserIdFromRequest(request);
    const clientIp = getClientIp(request);
    const viewerId = userId ?? undefined;
    const post = await getPostReadAccessById(postId, viewerId);
    if (!post) {
      return jsonError(404, {
        code: "POST_NOT_FOUND",
        message: "게시물을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, viewerId);

    if (userId) {
      const clientFingerprint = request.headers.get("x-client-fingerprint")?.trim() || undefined;
      await enforceAuthenticatedWriteRateLimit({
        scope: "comment:create",
        userId,
        ip: clientIp,
        clientFingerprint,
      });
      const comment = await createComment({
        authorId: userId,
        postId,
        parentId: body.parentId,
        input: { content: body.content ?? "" },
      });
      return jsonOk(comment, { status: 201 });
    }

    const guestPostPolicy = await getGuestPostPolicy();
    const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
    const guestRateKey = `comments:guest:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
    await enforceRateLimit({
      key: `${guestRateKey}:10m`,
      limit: Math.max(5, guestPostPolicy.postRateLimit10m),
      windowMs: 10 * 60_000,
    });
    await assertGuestStepUp({
      scope: "comment:create",
      ip: clientIp,
      fingerprint: guestFingerprint,
      token: request.headers.get("x-guest-step-up-token"),
      proof: request.headers.get("x-guest-step-up-proof"),
    });

    const guestDisplayName = body.guestDisplayName?.trim() || "익명";
    const guestPassword = body.guestPassword?.trim() || "";
    if (!guestPassword) {
      return jsonError(400, {
        code: "GUEST_PASSWORD_REQUIRED",
        message: "비회원 댓글에는 비밀번호가 필요합니다.",
      });
    }

    const { ipHash, fingerprintHash } = hashGuestIdentity({
      ip: clientIp,
      fingerprint: guestFingerprint,
    });
    const guestIpMeta = buildGuestIpMeta({
      ip: clientIp,
      fingerprint: guestFingerprint,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const guestPasswordHash = hashGuestCommentPassword(guestPassword);
    const guestSystemUserId = await getOrCreateGuestSystemUserId();
    const guestAuthor = await createGuestAuthor({
      displayName: guestDisplayName,
      passwordHash: guestPasswordHash,
      ipHash,
      fingerprintHash,
      ipDisplay: guestIpMeta.guestIpDisplay,
      ipLabel: guestIpMeta.guestIpLabel,
    });

    const comment = await createComment({
      authorId: guestSystemUserId,
      postId,
      parentId: body.parentId,
      input: { content: body.content ?? "" },
      guestMeta: {
        guestAuthorId: guestAuthor.id,
        guestIdentity: {
          ip: clientIp,
          fingerprint: guestFingerprint,
        },
      },
    });

    return jsonOk(comment, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/posts/[id]/comments", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
