import { describe, expect, it } from "vitest";

import {
  directPostVisibilitySchema,
  directUserContentHideSchema,
  directUserContentRestoreSchema,
  directUserSanctionSchema,
  getDirectUserContentScopeLabel,
} from "@/lib/validations/direct-moderation";

describe("direct moderation validations", () => {
  it("accepts a sanction payload with trimmed identifier and reason", () => {
    const result = directUserSanctionSchema.safeParse({
      userKey: " admin@gmail.com ",
      reason: "  스팸 도배  ",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      userKey: "admin@gmail.com",
      reason: "스팸 도배",
    });
  });

  it("defaults content hide scope to last 24 hours", () => {
    const result = directUserContentHideSchema.safeParse({
      userKey: "user-1",
      reason: "같은 링크 반복 게시",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.scope).toBe("LAST_24H");
  });

  it("rejects blank reasons", () => {
    const result = directUserContentHideSchema.safeParse({
      userKey: "user-1",
      reason: "   ",
      scope: "LAST_7D",
    });

    expect(result.success).toBe(false);
  });

  it("defaults restore scope to all content", () => {
    const result = directUserContentRestoreSchema.safeParse({
      userKey: "user-1",
      reason: "오탐 복구",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.scope).toBe("ALL_ACTIVE");
  });

  it("accepts a post visibility payload with trimmed reason", () => {
    const result = directPostVisibilitySchema.safeParse({
      action: "HIDE",
      reason: "  스팸 게시글 숨김  ",
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      action: "HIDE",
      reason: "스팸 게시글 숨김",
    });
  });

  it("formats scope labels", () => {
    expect(getDirectUserContentScopeLabel("LAST_24H")).toBe("최근 24시간");
    expect(getDirectUserContentScopeLabel("LAST_7D")).toBe("최근 7일");
    expect(getDirectUserContentScopeLabel("ALL_ACTIVE")).toBe("전체 범위");
  });
});
