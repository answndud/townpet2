import { describe, expect, it } from "vitest";

import {
  POST_DETAIL_ACTION_BUTTON_CLASS_NAME,
  POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME,
} from "@/components/posts/post-detail-action-button-class";

describe("post detail action button classes", () => {
  it("keeps edit action vertically centered like other inline buttons", () => {
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("tp-btn-soft");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("tp-btn-sm");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("inline-flex");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("items-center");
    expect(POST_DETAIL_ACTION_BUTTON_CLASS_NAME).toContain("justify-center");
  });

  it("keeps delete action shape aligned with shared buttons while preserving danger colors", () => {
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).toContain(
      POST_DETAIL_ACTION_BUTTON_CLASS_NAME,
    );
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).toContain("border-rose-300");
    expect(POST_DETAIL_ACTION_DANGER_BUTTON_CLASS_NAME).toContain("text-rose-700");
  });
});
