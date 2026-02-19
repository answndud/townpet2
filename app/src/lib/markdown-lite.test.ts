import { describe, expect, it } from "vitest";

import { renderLiteMarkdown } from "@/lib/markdown-lite";

describe("renderLiteMarkdown", () => {
  it("renders emphasis and code blocks", () => {
    const html = renderLiteMarkdown("**굵게** *기울임* `코드`");

    expect(html).toContain("<strong>굵게</strong>");
    expect(html).toContain("<em>기울임</em>");
    expect(html).toContain("<code");
  });

  it("renders markdown links and bare urls", () => {
    const html = renderLiteMarkdown("[링크](https://example.com) https://townpet.dev");

    expect(html).toContain('href="https://example.com/');
    expect(html).toContain('href="https://townpet.dev/');
    expect(html).toContain("rel=\"noopener noreferrer nofollow\"");
  });

  it("escapes unsafe html input", () => {
    const html = renderLiteMarkdown("<script>alert(1)</script>");

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});
