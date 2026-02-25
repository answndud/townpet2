import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  hospitalReviewSchema,
  placeReviewSchema,
  postCreateSchema,
  postListSchema,
  walkRouteSchema,
} from "@/lib/validations/post";

describe("post validations", () => {
  it("accepts a valid post create payload", () => {
    const result = postCreateSchema.safeParse({
      title: "테스트",
      content: "내용",
      type: PostType.FREE_BOARD,
      scope: PostScope.LOCAL,
      neighborhoodId: "ckc7k5qsj0000u0t8qv6d1d7k",
      communityId: "ckc7k5qsj0000u0t8qv6d1d7k",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid hospital review rating", () => {
    const result = hospitalReviewSchema.safeParse({
      hospitalName: "동물병원",
      treatmentType: "검진",
      rating: 6,
    });

    expect(result.success).toBe(false);
  });

  it("accepts place review defaults", () => {
    const result = placeReviewSchema.safeParse({
      placeName: "펫카페",
      placeType: "카페",
      rating: 5,
    });

    expect(result.success).toBe(true);
    expect(result.data?.isPetAllowed).toBeUndefined();
  });

  it("parses walk route defaults", () => {
    const result = walkRouteSchema.safeParse({
      routeName: "산책로",
    });

    expect(result.success).toBe(true);
    expect(result.data?.difficulty).toBeUndefined();
  });

  it("accepts list filters", () => {
    const result = postListSchema.safeParse({
      type: PostType.PET_SHOWCASE,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(true);
  });

  it("rejects community posts without communityId", () => {
    const result = postCreateSchema.safeParse({
      title: "테스트",
      content: "내용",
      type: PostType.FREE_BOARD,
      scope: PostScope.GLOBAL,
    });

    expect(result.success).toBe(false);
  });

  it("rejects common-board posts with communityId", () => {
    const result = postCreateSchema.safeParse({
      title: "병원후기",
      content: "내용",
      type: PostType.HOSPITAL_REVIEW,
      scope: PostScope.GLOBAL,
      communityId: "ckc7k5qsj0000u0t8qv6d1d7k",
      animalTags: ["강아지"],
    });

    expect(result.success).toBe(false);
  });

  it("requires animal tags for common-board posts", () => {
    const result = postCreateSchema.safeParse({
      title: "거래글",
      content: "내용",
      type: PostType.MARKET_LISTING,
      scope: PostScope.GLOBAL,
      animalTags: ["강아지"],
    });

    expect(result.success).toBe(true);
  });
});
