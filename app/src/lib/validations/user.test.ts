import { describe, expect, it } from "vitest";

import {
  neighborhoodSelectSchema,
  profileUpdateSchema,
} from "@/lib/validations/user";

describe("user validations", () => {
  it("accepts a valid nickname", () => {
    const result = profileUpdateSchema.safeParse({ nickname: "townpet_user" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid nickname characters", () => {
    const result = profileUpdateSchema.safeParse({ nickname: "bad name" });
    expect(result.success).toBe(false);
  });

  it("accepts profile bio within max length", () => {
    const result = profileUpdateSchema.safeParse({
      nickname: "townpet_user",
      bio: "우리 동네 산책 코스를 자주 공유합니다.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a single neighborhood id (legacy payload)", () => {
    const result = neighborhoodSelectSchema.safeParse({
      neighborhoodId: "ckc7k5qsj0000u0t8qv6d1d7k",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.neighborhoodIds).toEqual(["ckc7k5qsj0000u0t8qv6d1d7k"]);
      expect(result.data.primaryNeighborhoodId).toBe("ckc7k5qsj0000u0t8qv6d1d7k");
    }
  });

  it("accepts up to three neighborhoods with primary", () => {
    const result = neighborhoodSelectSchema.safeParse({
      neighborhoodIds: ["서울특별시::강남구", "부산광역시::해운대구", "대전광역시::서구"],
      primaryNeighborhoodId: "부산광역시::해운대구",
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than three neighborhoods", () => {
    const result = neighborhoodSelectSchema.safeParse({
      neighborhoodIds: [
        "ckc7k5qsj0000u0t8qv6d1d7k",
        "ckc7k5qsj0000u0t8qv6d1d7l",
        "ckc7k5qsj0000u0t8qv6d1d7m",
        "ckc7k5qsj0000u0t8qv6d1d7n",
      ],
      primaryNeighborhoodId: "ckc7k5qsj0000u0t8qv6d1d7k",
    });

    expect(result.success).toBe(false);
  });

  it("rejects primary neighborhood outside selected list", () => {
    const result = neighborhoodSelectSchema.safeParse({
      neighborhoodIds: ["ckc7k5qsj0000u0t8qv6d1d7k"],
      primaryNeighborhoodId: "ckc7k5qsj0000u0t8qv6d1d7l",
    });

    expect(result.success).toBe(false);
  });
});
