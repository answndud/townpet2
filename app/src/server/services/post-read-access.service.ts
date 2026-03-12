import { PostScope, PostStatus, PostType, UserRole } from "@prisma/client";

import { canGuestReadPost } from "@/lib/post-access";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { ServiceError } from "@/server/services/service-error";

type ReadablePost = {
  status: PostStatus;
  scope: PostScope;
  type: PostType;
  neighborhood?: { id: string } | null;
  neighborhoodId?: string | null;
};

type PostReadAccessOptions = {
  viewerRole?: UserRole | null;
  allowModeratorHiddenRead?: boolean;
};

function canModeratorReadHiddenPost(options?: PostReadAccessOptions) {
  if (!options?.allowModeratorHiddenRead) {
    return false;
  }

  return options.viewerRole === UserRole.ADMIN || options.viewerRole === UserRole.MODERATOR;
}

export async function assertPostReadable(
  post: ReadablePost,
  viewerId?: string,
  options?: PostReadAccessOptions,
) {
  const allowModeratorHiddenRead = canModeratorReadHiddenPost(options);

  if (post.status !== PostStatus.ACTIVE && !(allowModeratorHiddenRead && post.status === PostStatus.HIDDEN)) {
    throw new ServiceError("게시글을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
  if (!viewerId) {
    if (
      !canGuestReadPost({
        scope: post.scope,
        type: post.type,
        loginRequiredTypes,
      })
    ) {
      throw new ServiceError(
        "이 게시글은 로그인 후 열람할 수 있습니다.",
        "AUTH_REQUIRED",
        401,
      );
    }
    return;
  }

  if (allowModeratorHiddenRead) {
    return;
  }

  if (post.scope !== PostScope.LOCAL) {
    return;
  }

  const userWithNeighborhoods = await getUserWithNeighborhoods(viewerId);
  const primaryNeighborhood = userWithNeighborhoods?.neighborhoods.find(
    (item) => item.isPrimary,
  );

  if (!primaryNeighborhood) {
    throw new ServiceError("대표 동네를 설정해 주세요.", "NEIGHBORHOOD_REQUIRED", 400);
  }

  const postNeighborhoodId = post.neighborhood?.id ?? post.neighborhoodId ?? null;
  if (!postNeighborhoodId || postNeighborhoodId !== primaryNeighborhood.neighborhood.id) {
    throw new ServiceError(
      "다른 동네 게시글은 열람할 수 없습니다.",
      "FORBIDDEN",
      403,
    );
  }
}
