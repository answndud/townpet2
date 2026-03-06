import { describe, expect, it } from "vitest";

import { getGuestPostMeta } from "@/lib/post-guest-meta";

describe("getGuestPostMeta", () => {
  it("detects guest posts from top-level guest fields", () => {
    expect(
      getGuestPostMeta({
        guestAuthorId: "guest-1",
        guestDisplayName: "비회원",
        guestIpDisplay: "203.0.113",
        guestIpLabel: "아이피",
      }),
    ).toEqual({
      isGuestPost: true,
      guestAuthorName: "비회원",
      guestIpDisplay: "203.0.113",
      guestIpLabel: "아이피",
    });
  });

  it("detects guest posts from nested guest author fields", () => {
    expect(
      getGuestPostMeta({
        guestAuthor: {
          displayName: "익명",
          ipDisplay: "198.51.100",
          ipLabel: "아이피",
        },
      }),
    ).toEqual({
      isGuestPost: true,
      guestAuthorName: "익명",
      guestIpDisplay: "198.51.100",
      guestIpLabel: "아이피",
    });
  });

  it("does not mark member-authored posts as guest posts", () => {
    expect(
      getGuestPostMeta({
        guestAuthorId: null,
        guestDisplayName: null,
        guestAuthor: null,
      }),
    ).toEqual({
      isGuestPost: false,
      guestAuthorName: "",
      guestIpDisplay: null,
      guestIpLabel: null,
    });
  });
});
