type PostCommentViewerSyncPayload = {
  reason?: string;
};

export type PostCommentViewerState = {
  currentUserId?: string;
  canInteract: boolean;
};

export function getPostCommentViewerState({
  currentUserId,
  canInteract,
  canInteractWithPostOwner,
}: {
  currentUserId?: string;
  canInteract: boolean;
  canInteractWithPostOwner: boolean;
}): PostCommentViewerState {
  return {
    currentUserId,
    canInteract: canInteract && canInteractWithPostOwner,
  };
}

export function syncPostCommentViewerState(
  baseState: PostCommentViewerState,
  payload: PostCommentViewerSyncPayload,
): PostCommentViewerState {
  if (payload.reason === "auth-logout") {
    return {
      currentUserId: undefined,
      canInteract: false,
    };
  }

  return baseState;
}
