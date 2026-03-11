import { describe, expect, it } from "vitest";

import {
  POST_COMMENT_SECTION_STATE_CLASS_NAME,
  POST_COMMENT_THREAD_CARD_CLASS_NAME,
} from "@/components/posts/post-comment-layout-class";

describe("post comment layout classes", () => {
  it("keeps the thread card aligned by relying on outer layout gap", () => {
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("tp-card");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("w-full");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("p-4");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("mt-6");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("sm:mt-8");
  });

  it("keeps comment loading states free of extra top margin", () => {
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).toContain("rounded-lg");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).toContain("py-2.5");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).not.toContain("mt-5");
  });
});
