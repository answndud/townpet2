import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOGIN_REQUIRED_POST_TYPES,
  canGuestReadPost,
  isLoginRequiredPostType,
  normalizeLoginRequiredPostTypes,
} from "@/lib/post-access";

describe("post access policy", () => {
  it("marks sensitive post types as login required", () => {
    expect(isLoginRequiredPostType(PostType.HOSPITAL_REVIEW)).toBe(true);
    expect(isLoginRequiredPostType(PostType.MEETUP)).toBe(true);
    expect(isLoginRequiredPostType(PostType.FREE_BOARD)).toBe(false);
  });

  it("allows guests only on global and non-sensitive posts", () => {
    expect(
      canGuestReadPost({
        scope: PostScope.GLOBAL,
        type: PostType.FREE_BOARD,
      }),
    ).toBe(true);
    expect(
      canGuestReadPost({
        scope: PostScope.LOCAL,
        type: PostType.FREE_BOARD,
      }),
    ).toBe(false);
    expect(
      canGuestReadPost({
        scope: PostScope.GLOBAL,
        type: PostType.HOSPITAL_REVIEW,
      }),
    ).toBe(false);
  });

  it("normalizes configured type lists", () => {
    expect(
      normalizeLoginRequiredPostTypes([
        "HOSPITAL_REVIEW",
        "HOSPITAL_REVIEW",
        "MEETUP",
        "INVALID",
      ]),
    ).toEqual([PostType.HOSPITAL_REVIEW, PostType.MEETUP]);
  });

  it("allows empty list when explicitly configured", () => {
    expect(
      normalizeLoginRequiredPostTypes([], DEFAULT_LOGIN_REQUIRED_POST_TYPES, {
        allowEmpty: true,
      }),
    ).toEqual([]);
  });
});
