import { PostType, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  NEW_USER_RESTRICTION_HOURS,
  evaluateNewUserPostWritePolicy,
} from "@/lib/post-write-policy";

describe("evaluateNewUserPostWritePolicy", () => {
  it("blocks restricted categories for accounts younger than 24 hours", () => {
    const now = new Date("2026-02-19T12:00:00.000Z");
    const createdAt = new Date("2026-02-19T02:30:00.000Z");

    const result = evaluateNewUserPostWritePolicy({
      role: UserRole.USER,
      accountCreatedAt: createdAt,
      postType: PostType.MARKET_LISTING,
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.remainingHours).toBe(15);
    expect(result.message).toContain("마켓");
  });

  it("allows unrestricted categories for new users", () => {
    const now = new Date("2026-02-19T12:00:00.000Z");
    const createdAt = new Date("2026-02-19T10:30:00.000Z");

    const result = evaluateNewUserPostWritePolicy({
      role: UserRole.USER,
      accountCreatedAt: createdAt,
      postType: PostType.FREE_POST,
      now,
    });

    expect(result).toEqual({
      allowed: true,
      remainingHours: 0,
      message: null,
    });
  });

  it("allows restricted categories for old users", () => {
    const now = new Date("2026-02-19T12:00:00.000Z");
    const createdAt = new Date("2026-02-17T11:30:00.000Z");

    const result = evaluateNewUserPostWritePolicy({
      role: UserRole.USER,
      accountCreatedAt: createdAt,
      postType: PostType.LOST_FOUND,
      now,
    });

    expect(result.allowed).toBe(true);
  });

  it("does not apply restriction to moderator/admin", () => {
    const now = new Date("2026-02-19T12:00:00.000Z");
    const createdAt = new Date("2026-02-19T11:30:00.000Z");

    const result = evaluateNewUserPostWritePolicy({
      role: UserRole.MODERATOR,
      accountCreatedAt: createdAt,
      postType: PostType.MEETUP,
      now,
    });

    expect(result.allowed).toBe(true);
    expect(result.remainingHours).toBe(0);
    expect(result.message).toBeNull();
  });

  it("uses default minimum account age as 24 hours", () => {
    expect(NEW_USER_RESTRICTION_HOURS).toBe(24);
  });
});
