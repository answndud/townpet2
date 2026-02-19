import { NextRequest } from "next/server";

import { requireCurrentUser } from "@/server/auth";
import { getPostById } from "@/server/queries/post.queries";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { deletePost, updatePost } from "@/server/services/post.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const post = await getPostById(id, user.id);

    if (!post) {
      return jsonError(404, {
        code: "POST_NOT_FOUND",
        message: "게시물을 찾을 수 없습니다.",
      });
    }

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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const user = await requireCurrentUser();
    const post = await updatePost({ postId: id, authorId: user.id, input: body });
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
    const { id } = await params;
    const user = await requireCurrentUser();
    const result = await deletePost({ postId: id, authorId: user.id });
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
