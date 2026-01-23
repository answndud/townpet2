import { NextRequest } from "next/server";

import { postListSchema } from "@/lib/validations/post";
import { listPosts } from "@/server/queries/post.queries";
import { getUserByEmail } from "@/server/queries/user.queries";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { createPost } from "@/server/services/post.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = postListSchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    scope: searchParams.get("scope") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, {
      code: "INVALID_QUERY",
      message: "잘못된 요청 파라미터입니다.",
    });
  }

  const data = await listPosts(parsed.data);
  return jsonOk(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
    enforceRateLimit({ key: `posts:${email}`, limit: 5, windowMs: 60_000 });
    const user = await getUserByEmail(email);

    if (!user) {
      return jsonError(404, {
        code: "USER_NOT_FOUND",
        message: "작성자 정보를 찾을 수 없습니다.",
      });
    }

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
