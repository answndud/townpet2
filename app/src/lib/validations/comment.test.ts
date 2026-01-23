import { describe, expect, it } from "vitest";

import { commentCreateSchema, commentUpdateSchema } from "@/lib/validations/comment";

describe("comment validations", () => {
  it("accepts valid comment content", () => {
    const result = commentCreateSchema.safeParse({ content: "댓글 테스트" });
    expect(result.success).toBe(true);
  });

  it("rejects empty comment content", () => {
    const result = commentCreateSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("accepts update payload", () => {
    const result = commentUpdateSchema.safeParse({ content: "수정" });
    expect(result.success).toBe(true);
  });
});
