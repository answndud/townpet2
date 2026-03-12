import { describe, expect, it } from "vitest";

import {
  getPostCommentViewerState,
  resolvePostCommentFetchGuestMode,
  syncPostCommentViewerState,
} from "@/components/posts/post-comment-viewer-state";
import { shouldAutoLoadPostComments } from "@/components/posts/post-comment-load-state";

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

  it("uses forced guest mode whenever the initial guest route or auth-logout state requires it", () => {
    expect(
      resolvePostCommentFetchGuestMode({
        initialForceGuestMode: false,
        forcedGuestMode: true,
      }),
    ).toBe(true);

    expect(
      resolvePostCommentFetchGuestMode({
        initialForceGuestMode: true,
        forcedGuestMode: false,
      }),
    ).toBe(true);

    expect(
      resolvePostCommentFetchGuestMode({
        initialForceGuestMode: false,
        forcedGuestMode: false,
      }),
    ).toBe(false);
  });
});

describe("PostCommentSectionClient loading policy", () => {
  it("starts loading immediately when there is no prefetched state", () => {
    expect(
      shouldAutoLoadPostComments({
        pageData: null,
        error: null,
        isLoading: false,
        prefetchStatus: "idle",
      }),
    ).toBe(true);
  });

  it("waits for parent prefetch when comments are already loading in the detail client", () => {
    expect(
      shouldAutoLoadPostComments({
        pageData: null,
        error: null,
        isLoading: false,
        prefetchStatus: "loading",
      }),
    ).toBe(false);
  });

  it("does not auto-load again once prefetched comments are ready or failed", () => {
    expect(
      shouldAutoLoadPostComments({
        pageData: {
          comments: [],
          bestComments: [],
          totalCount: 0,
          totalRootCount: 0,
          page: 1,
          totalPages: 1,
          limit: 30,
        },
        error: null,
        isLoading: false,
        prefetchStatus: "ready",
      }),
    ).toBe(false);

    expect(
      shouldAutoLoadPostComments({
        pageData: null,
        error: "댓글을 불러오지 못했습니다.",
        isLoading: false,
        prefetchStatus: "error",
      }),
    ).toBe(false);
  });
});
