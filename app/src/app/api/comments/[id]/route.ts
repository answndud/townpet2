import { NextRequest } from "next/server";

import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import {
  deleteComment,
  deleteGuestComment,
  updateComment,
  updateGuestComment,
} from "@/server/services/comment.service";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params;
    const body = await request.json();
    const guestPassword = typeof body.guestPassword === "string" ? body.guestPassword.trim() : "";

    if (guestPassword) {
      const clientIp = getClientIp(request);
      const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
      const guestRateKey = `comments:guest-update:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
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

      const updated = await updateGuestComment({
        commentId,
        input: { content: body.content },
        guestPassword,
        guestIdentity: {
          ip: clientIp,
          fingerprint: guestFingerprint,
        },
      });

      return jsonOk(updated);
    }

    const forceGuestMode =
      process.env.NODE_ENV !== "production" && request.headers.get("x-guest-mode") === "1";
    const user = forceGuestMode ? null : await getCurrentUser();

    if (user) {
      const updated = await updateComment({
        commentId,
        authorId: user.id,
        input: { content: body.content },
      });
      return jsonOk(updated);
    }

    return jsonError(400, {
      code: "GUEST_PASSWORD_REQUIRED",
      message: "비회원 댓글 수정에는 비밀번호가 필요합니다.",
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "PATCH /api/comments/[id]", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params;

    let guestPassword = request.headers.get("x-guest-password")?.trim() || "";
    if (!guestPassword) {
      try {
        const body = (await request.json()) as { guestPassword?: string };
        guestPassword = body.guestPassword?.trim() ?? "";
      } catch {
        guestPassword = "";
      }
    }

    if (guestPassword) {
      const clientIp = getClientIp(request);
      const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
      const guestRateKey = `comments:guest-delete:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
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

      const deleted = await deleteGuestComment({
        commentId,
        guestPassword,
        guestIdentity: {
          ip: clientIp,
          fingerprint: guestFingerprint,
        },
      });

      return jsonOk(deleted);
    }

    const forceGuestMode =
      process.env.NODE_ENV !== "production" && request.headers.get("x-guest-mode") === "1";
    const user = forceGuestMode ? null : await getCurrentUser();

    if (user) {
      const deleted = await deleteComment({ commentId, authorId: user.id });
      return jsonOk(deleted);
    }

    return jsonError(400, {
      code: "GUEST_PASSWORD_REQUIRED",
      message: "비회원 댓글 삭제에는 비밀번호가 필요합니다.",
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "DELETE /api/comments/[id]", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
