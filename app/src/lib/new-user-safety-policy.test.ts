import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
  DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES,
  normalizeNewUserSafetyPolicy,
} from "@/lib/new-user-safety-policy";

describe("new-user-safety-policy", () => {
  it("returns defaults for invalid input", () => {
    const normalized = normalizeNewUserSafetyPolicy(null);

    expect(normalized.minAccountAgeHours).toBe(
      DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
    );
    expect(normalized.contactBlockWindowHours).toBe(
      DEFAULT_CONTACT_BLOCK_WINDOW_HOURS,
    );
    expect(normalized.restrictedPostTypes).toEqual(
      DEFAULT_NEW_USER_RESTRICTED_POST_TYPES,
    );
  });

  it("normalizes values and deduplicates post types", () => {
    const normalized = normalizeNewUserSafetyPolicy({
      minAccountAgeHours: "72",
      restrictedPostTypes: [
        PostType.MARKET_LISTING,
        PostType.MARKET_LISTING,
        "UNKNOWN",
        PostType.MEETUP,
      ],
      contactBlockWindowHours: 12.9,
    });

    expect(normalized.minAccountAgeHours).toBe(72);
    expect(normalized.contactBlockWindowHours).toBe(12);
    expect(normalized.restrictedPostTypes).toEqual([
      PostType.MARKET_LISTING,
      PostType.MEETUP,
    ]);
  });
});
