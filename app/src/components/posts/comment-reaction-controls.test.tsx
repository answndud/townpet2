import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  canUseCommentReaction,
  CommentReactionControls,
} from "@/components/posts/comment-reaction-controls";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/server/actions/comment", () => ({
  toggleCommentReactionAction: vi.fn(),
}));

describe("CommentReactionControls", () => {
  it("renders compact like and dislike controls with icon-only labels and counts", () => {
    const html = renderToStaticMarkup(
      <CommentReactionControls
        postId="post-1"
        commentId="comment-1"
        likeCount={8}
        dislikeCount={59}
        currentReaction={null}
        compact
      />,
    );

    expect(html).toContain('aria-label="좋아요 8"');
    expect(html).toContain('aria-label="싫어요 59"');
    expect(html).not.toContain("추천 8");
    expect(html).not.toContain("비추천 59");
    expect((html.match(/<svg/g) ?? []).length).toBe(2);
  });

  it("only allows comment reactions for signed-in users on active comments", () => {
    expect(
      canUseCommentReaction({
        currentUserId: undefined,
        canInteract: true,
        isCommentActive: true,
      }),
    ).toBe(false);
    expect(
      canUseCommentReaction({
        currentUserId: "user-1",
        canInteract: false,
        isCommentActive: true,
      }),
    ).toBe(false);
    expect(
      canUseCommentReaction({
        currentUserId: "user-1",
        canInteract: true,
        isCommentActive: false,
      }),
    ).toBe(false);
    expect(
      canUseCommentReaction({
        currentUserId: "user-1",
        canInteract: true,
        isCommentActive: true,
      }),
    ).toBe(true);
  });

  it("marks compact reaction buttons as auth-required for guests without disabling clicks", () => {
    const html = renderToStaticMarkup(
      <CommentReactionControls
        postId="post-1"
        commentId="comment-1"
        likeCount={3}
        dislikeCount={1}
        currentReaction={null}
        canReact={false}
        compact
      />,
    );

    expect((html.match(/aria-disabled="true"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('disabled=""');
  });
});
