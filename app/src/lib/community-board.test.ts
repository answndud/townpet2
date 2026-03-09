import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getDedicatedBoardPathByPostType } from "@/lib/community-board";

describe("getDedicatedBoardPathByPostType", () => {
  it("returns a dedicated board path for adoption listings", () => {
    expect(getDedicatedBoardPathByPostType(PostType.ADOPTION_LISTING)).toBe("/boards/adoption");
  });

  it("returns null for post types without a dedicated board page", () => {
    expect(getDedicatedBoardPathByPostType(PostType.FREE_BOARD)).toBeNull();
  });
});
