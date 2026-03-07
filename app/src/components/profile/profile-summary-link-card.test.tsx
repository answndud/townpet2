import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProfileSummaryLinkCard } from "@/components/profile/profile-summary-link-card";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ProfileSummaryLinkCard", () => {
  it("renders my-posts summary as a clickable card without button styling", () => {
    const html = renderToStaticMarkup(
      <ProfileSummaryLinkCard
        href="/my-posts"
        eyebrow="내 작성글"
        count={12}
        label="작성한 게시글"
        description="카테고리별로 내가 작성한 글을 모아 확인할 수 있습니다."
      />,
    );

    expect(html).toContain('href="/my-posts"');
    expect(html).toContain("내 작성글");
    expect(html).toContain("작성한 게시글");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("<button");
  });

  it("renders bookmarks summary as a clickable card without button styling", () => {
    const html = renderToStaticMarkup(
      <ProfileSummaryLinkCard
        href="/bookmarks"
        eyebrow="북마크"
        count={5}
        label="북마크한 글"
        description="다시 보고 싶은 글을 한곳에서 빠르게 확인할 수 있습니다."
      />,
    );

    expect(html).toContain('href="/bookmarks"');
    expect(html).toContain("북마크한 글");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("<button");
  });
});
