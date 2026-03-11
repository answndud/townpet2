import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReactionLoginPrompt } from "@/components/posts/reaction-login-prompt";

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

describe("ReactionLoginPrompt", () => {
  it("renders shared desktop and mobile login CTA surfaces when open", () => {
    const html = renderToStaticMarkup(
      <ReactionLoginPrompt
        isOpen
        message="좋아요/싫어요는 로그인 후 이용할 수 있어요."
        loginHref="/login?next=%2Fposts%2Fpost-1"
        align="end"
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("좋아요/싫어요는 로그인 후 이용할 수 있어요.");
    expect(html).toContain('/login?next=%2Fposts%2Fpost-1');
    expect(html).toContain("닫기");
    expect(html).toContain("로그인하기");
    expect(html).toContain("sm:hidden");
    expect(html).toContain("hidden min-w-[220px] sm:block");
  });
});
