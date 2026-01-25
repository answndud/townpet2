import { NextRequest } from "next/server";

import { requireCurrentUser } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { deletePost, updatePost } from "@/server/services/post.service";

type RouteParams = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const user = await requireCurrentUser();
    const post = await updatePost({ postId: params.id, authorId: user.id, input: body });
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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCurrentUser();
    const result = await deletePost({ postId: params.id, authorId: user.id });
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
