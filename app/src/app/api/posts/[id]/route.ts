import { NextRequest } from "next/server";

import { canGuestReadPost } from "@/lib/post-access";
import { getCurrentUser } from "@/server/auth";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getPostById } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
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
    const user = await getCurrentUser();
    const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
    const { id } = await params;
    const post = await getPostById(id, user?.id);

    if (!post) {
      return jsonError(404, {
        code: "POST_NOT_FOUND",
        message: "게시물을 찾을 수 없습니다.",
      });
    }

    if (
      !user &&
      !canGuestReadPost({
        scope: post.scope,
        type: post.type,
        loginRequiredTypes: loginRequiredTypes,
      })
    ) {
      return jsonError(401, {
        code: "AUTH_REQUIRED",
        message: "이 게시글은 로그인 후 열람할 수 있습니다.",
      });
    }

    const didCountView = await registerPostView({
      postId: id,
      userId: user?.id,
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
    const user = forceGuestMode ? null : await getCurrentUser();
    if (user) {
      const post = await updatePost({ postId: id, authorId: user.id, input: body });
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

    const post = await updateGuestPost({
      postId: id,
      input: body,
      guestPassword,
      guestIdentity: {
        ip: getClientIp(request),
        fingerprint: request.headers.get("x-guest-fingerprint")?.trim() || undefined,
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
    const user = forceGuestMode ? null : await getCurrentUser();
    if (user) {
      const result = await deletePost({ postId: id, authorId: user.id });
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

    const result = await deleteGuestPost({
      postId: id,
      guestPassword,
      guestIdentity: {
        ip: getClientIp(request),
        fingerprint: request.headers.get("x-guest-fingerprint")?.trim() || undefined,
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

    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
