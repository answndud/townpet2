import { NextRequest } from "next/server";

import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getPostById } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";
import {
  deleteGuestPost,
  deletePost,
  registerPostView,
  updateGuestPost,
  updatePost,
} from "@/server/services/post.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserIdFromRequest(request);
    const viewerId = userId ?? undefined;
    const { id } = await params;
    const post = await getPostById(id, viewerId);

    if (!post) {
      return jsonError(404, {
        code: "POST_NOT_FOUND",
        message: "게시물을 찾을 수 없습니다.",
      });
    }

    await assertPostReadable(post, viewerId);

    const didCountView = await registerPostView({
      postId: id,
      userId: viewerId,
      clientIp: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const safeViewCount = Number.isFinite(post.viewCount)
      ? Number(post.viewCount) + (didCountView ? 1 : 0)
      : didCountView
        ? 1
        : 0;

    return jsonOk({ ...post, viewCount: safeViewCount });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "GET /api/posts/[id]", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const forceGuestMode =
      process.env.NODE_ENV !== "production" && request.headers.get("x-guest-mode") === "1";
    const userId = forceGuestMode ? null : await getCurrentUserIdFromRequest(request);
    if (userId) {
      const post = await updatePost({ postId: id, authorId: userId, input: body });
      return jsonOk(post);
    }

    const guestPassword =
      typeof body?.guestPassword === "string" ? body.guestPassword.trim() : "";
    if (!guestPassword) {
      return jsonError(400, {
        code: "GUEST_PASSWORD_REQUIRED",
        message: "비회원 수정에는 글 비밀번호가 필요합니다.",
      });
    }

    const clientIp = getClientIp(request);
    const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
    const guestRateKey = `posts:guest-update:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
    const guestPostPolicy = await getGuestPostPolicy();
    await enforceRateLimit({
      key: `${guestRateKey}:10m`,
      limit: Math.max(5, guestPostPolicy.postRateLimit10m),
      windowMs: 10 * 60_000,
    });
    await enforceRateLimit({
      key: `${guestRateKey}:1h`,
      limit: guestPostPolicy.postRateLimit1h,
      windowMs: 60 * 60_000,
    });

    const post = await updateGuestPost({
      postId: id,
      input: body,
      guestPassword,
      guestIdentity: {
        ip: clientIp,
        fingerprint: guestFingerprint,
      },
    });
    return jsonOk(post);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "PATCH /api/posts/[id]", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const forceGuestMode =
      process.env.NODE_ENV !== "production" && request.headers.get("x-guest-mode") === "1";
    const userId = forceGuestMode ? null : await getCurrentUserIdFromRequest(request);
    if (userId) {
      const result = await deletePost({ postId: id, authorId: userId });
      return jsonOk(result);
    }

    let guestPassword = request.headers.get("x-guest-password")?.trim() || "";
    if (!guestPassword) {
      try {
        const body = (await request.json()) as { guestPassword?: string };
        guestPassword = body.guestPassword?.trim() ?? "";
      } catch {
        guestPassword = "";
      }
    }

    if (!guestPassword) {
      return jsonError(400, {
        code: "GUEST_PASSWORD_REQUIRED",
        message: "비회원 삭제에는 글 비밀번호가 필요합니다.",
      });
    }

    const clientIp = getClientIp(request);
    const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
    const guestRateKey = `posts:guest-delete:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
    const guestPostPolicy = await getGuestPostPolicy();
    await enforceRateLimit({
      key: `${guestRateKey}:10m`,
      limit: Math.max(5, guestPostPolicy.postRateLimit10m),
      windowMs: 10 * 60_000,
    });
    await enforceRateLimit({
      key: `${guestRateKey}:1h`,
      limit: guestPostPolicy.postRateLimit1h,
      windowMs: 60 * 60_000,
    });

    const result = await deleteGuestPost({
      postId: id,
      guestPassword,
      guestIdentity: {
        ip: clientIp,
        fingerprint: guestFingerprint,
      },
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "DELETE /api/posts/[id]", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
