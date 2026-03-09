import { describe, expect, it } from "vitest";

import { getPostTypeMeta } from "@/lib/post-presenter";

describe("getPostTypeMeta", () => {
  it("returns defined meta for known post types", () => {
    const meta = getPostTypeMeta("FREE_BOARD");

    expect(meta.label).toBe("자유게시판");
    expect(meta.icon).toBe("B");
  });

  it("falls back safely for unknown post types", () => {
    const meta = getPostTypeMeta("UNKNOWN_POST_TYPE");

    expect(meta).toMatchObject({
      label: "게시글",
      icon: "P",
    });
  });
});
