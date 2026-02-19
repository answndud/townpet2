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

  it("accepts a neighborhood id", () => {
    const result = neighborhoodSelectSchema.safeParse({
      neighborhoodId: "ckc7k5qsj0000u0t8qv6d1d7k",
    });
    expect(result.success).toBe(true);
  });
});
