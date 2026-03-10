import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedPostMetaBadges } from "@/components/posts/feed-post-meta-badges";

describe("FeedPostMetaBadges", () => {
  it("renders the board chip and hidden badge for hidden posts", () => {
    const html = renderToStaticMarkup(
      <FeedPostMetaBadges
        label="자유게시판"
        chipClass="border-zinc-300 bg-zinc-100 text-zinc-700"
        status="HIDDEN"
      />,
    );

    expect(html).toContain("자유게시판");
    expect(html).toContain("숨김");
  });

  it("does not render the hidden badge for active posts", () => {
    const html = renderToStaticMarkup(
      <FeedPostMetaBadges
        label="자유게시판"
        chipClass="border-zinc-300 bg-zinc-100 text-zinc-700"
        status="ACTIVE"
      />,
    );

    expect(html).toContain("자유게시판");
    expect(html).not.toContain("숨김");
  });

  it("renders caller-provided layout classes for responsive alignment", () => {
    const html = renderToStaticMarkup(
      <FeedPostMetaBadges
        label="자유게시판"
        chipClass="border-zinc-300 bg-zinc-100 text-zinc-700"
        status="ACTIVE"
        className="justify-start sm:justify-end"
      />,
    );

    expect(html).toContain("justify-start sm:justify-end");
  });
});
