import { NextRequest } from "next/server";

import { buildGuestIpMeta } from "@/lib/guest-ip-display";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import {
  createComment,
  hashGuestCommentPassword,
} from "@/server/services/comment.service";
import { getOrCreateGuestSystemUserId } from "@/server/services/guest-author.service";
import { hashGuestIdentity } from "@/server/services/guest-safety.service";
import { ServiceError } from "@/server/services/service-error";

type RouteParams = {
  params: Promise<{ id: string }>;
};

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
    const user = forceGuestMode ? null : await getCurrentUser();

    if (user) {
      await enforceRateLimit({ key: `comments:${user.id}`, limit: 10, windowMs: 60_000 });
      const comment = await createComment({
        authorId: user.id,
        postId,
        parentId: body.parentId,
        input: { content: body.content ?? "" },
      });
      return jsonOk(comment, { status: 201 });
    }

    const guestPostPolicy = await getGuestPostPolicy();
    const clientIp = getClientIp(request);
    const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
    const guestRateKey = `comments:guest:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
    await enforceRateLimit({
      key: `${guestRateKey}:10m`,
      limit: Math.max(5, guestPostPolicy.postRateLimit10m),
      windowMs: 10 * 60_000,
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
    const guestAuthor = await prisma.guestAuthor.create({
      data: {
        displayName: guestDisplayName,
        passwordHash: guestPasswordHash,
        ipHash,
        fingerprintHash,
        ipDisplay: guestIpMeta.guestIpDisplay,
        ipLabel: guestIpMeta.guestIpLabel,
      },
      select: { id: true },
    });

    const comment = await createComment({
      authorId: guestSystemUserId,
      postId,
      parentId: body.parentId,
      input: { content: body.content ?? "" },
      guestMeta: {
        guestAuthorId: guestAuthor.id,
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
