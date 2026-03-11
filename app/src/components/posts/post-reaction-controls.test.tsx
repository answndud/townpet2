import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PostReactionControls } from "@/components/posts/post-reaction-controls";

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

vi.mock("@/server/actions/post", () => ({
  togglePostReactionAction: vi.fn(),
}));

describe("PostReactionControls", () => {
  it("marks reaction buttons as auth-required for guests without disabling clicks", () => {
    const html = renderToStaticMarkup(
      <PostReactionControls
        postId="post-1"
        likeCount={8}
        dislikeCount={3}
        currentReaction={null}
        canReact={false}
      />,
    );

    expect((html.match(/aria-disabled="true"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('disabled=""');
    expect(html).toContain("좋아요");
    expect(html).toContain("싫어요");
  });
});
