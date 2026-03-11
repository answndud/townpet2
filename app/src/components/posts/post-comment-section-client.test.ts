import { describe, expect, it } from "vitest";

import {
  getPostCommentViewerState,
  syncPostCommentViewerState,
} from "@/components/posts/post-comment-viewer-state";

describe("PostCommentSectionClient viewer sync", () => {
  it("derives interactive viewer state only when comment interaction is allowed", () => {
    expect(
      getPostCommentViewerState({
        currentUserId: "user-1",
        canInteract: true,
        canInteractWithPostOwner: true,
      }),
    ).toEqual({
      currentUserId: "user-1",
      canInteract: true,
    });

    expect(
      getPostCommentViewerState({
        currentUserId: "user-1",
        canInteract: true,
        canInteractWithPostOwner: false,
      }),
    ).toEqual({
      currentUserId: "user-1",
      canInteract: false,
    });
  });

  it("drops to guest interaction state on auth-logout sync", () => {
    expect(
      syncPostCommentViewerState(
        {
          currentUserId: "user-1",
          canInteract: true,
        },
        {
          reason: "auth-logout",
        },
      ),
    ).toEqual({
      currentUserId: undefined,
      canInteract: false,
    });
  });
});
