import { describe, expect, it } from "vitest";

import {
  POST_COMMENT_FORM_FIELD_CLASS_NAME,
  POST_COMMENT_FORM_MUTED_CLASS_NAME,
  POST_COMMENT_FORM_PANEL_CLASS_NAME,
  POST_COMMENT_SECTION_STATE_CLASS_NAME,
  POST_COMMENT_THREAD_CARD_CLASS_NAME,
} from "@/components/posts/post-comment-layout-class";

describe("post comment layout classes", () => {
  it("keeps the thread card aligned by relying on outer layout gap while using the brighter card surface", () => {
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("tp-card");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("w-full");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).toContain("p-4");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("tp-surface-page-soft");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("mt-6");
    expect(POST_COMMENT_THREAD_CARD_CLASS_NAME).not.toContain("sm:mt-8");
  });

  it("keeps comment loading states free of extra top margin without forcing a tinted surface", () => {
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).toContain("rounded-lg");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).toContain("py-2.5");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).not.toContain("tp-surface-page-soft");
    expect(POST_COMMENT_SECTION_STATE_CLASS_NAME).not.toContain("mt-5");
  });

  it("uses dedicated bright page-soft classes for comment composer surfaces", () => {
    expect(POST_COMMENT_FORM_PANEL_CLASS_NAME).toContain("tp-form-panel");
    expect(POST_COMMENT_FORM_PANEL_CLASS_NAME).toContain("tp-form-panel-page-soft");
    expect(POST_COMMENT_FORM_FIELD_CLASS_NAME).toBe("tp-form-field-page-soft");
    expect(POST_COMMENT_FORM_MUTED_CLASS_NAME).toContain("tp-form-panel-muted");
    expect(POST_COMMENT_FORM_MUTED_CLASS_NAME).toContain("tp-form-field-page-soft");
  });
});
