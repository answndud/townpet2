import { NextRequest } from "next/server";

import { postListSchema } from "@/lib/validations/post";
import { listPosts } from "@/server/queries/post.queries";
import { getCurrentUser, requireCurrentUser } from "@/server/auth";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { createPost } from "@/server/services/post.service";

export async function GET(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() ?? "anonymous";
    const headerUserId = request.headers.get("x-user-id");
    const currentUser = await getCurrentUser();
    const rateKey = headerUserId
      ? `feed:user:${headerUserId}`
      : currentUser
        ? `feed:user:${currentUser.id}`
        : `feed:ip:${clientIp}`;
    enforceRateLimit({ key: rateKey, limit: 30, windowMs: 60_000 });
    const { searchParams } = new URL(request.url);
    const parsed = postListSchema.safeParse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const data = await listPosts(parsed.data);
    return jsonOk(data);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await requireCurrentUser();
    enforceRateLimit({ key: `posts:${user.id}`, limit: 5, windowMs: 60_000 });

    const post = await createPost({ authorId: user.id, input: body });
    return jsonOk(post, { status: 201 });
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
