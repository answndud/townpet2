import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PostDetailInfoItem,
  PostDetailInfoSection,
  resolvePostDetailInfoItemSpanClass,
} from "@/components/posts/post-detail-info-section";

describe("PostDetailInfoSection", () => {
  it("renders a shared section shell and info items", () => {
    const html = renderToStaticMarkup(
      <PostDetailInfoSection title="산책코스 상세">
        <PostDetailInfoItem label="거리" value="3km" />
        <PostDetailInfoItem label="안전 태그" value="가로등" span="full" />
      </PostDetailInfoSection>,
    );

    expect(html).toContain("산책코스 상세");
    expect(html).toContain("거리");
    expect(html).toContain("3km");
    expect(html).toContain("안전 태그");
    expect(html).toContain("md:col-span-3");
  });

  it("falls back to the base width when an unknown span is requested", () => {
    expect(resolvePostDetailInfoItemSpanClass("unexpected")).toBe("");
  });
});
