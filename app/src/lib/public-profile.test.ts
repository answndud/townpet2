import { describe, expect, it } from "vitest";

import {
  buildPublicProfileLoginHref,
  buildPublicProfileTabHref,
  getPublicProfileLoginNoticeMessage,
  getVisiblePublicProfileTabs,
  resolvePublicProfileTab,
} from "@/lib/public-profile";

describe("public profile helpers", () => {
  it("builds login redirect href for unauthenticated viewers", () => {
    expect(buildPublicProfileLoginHref("user-1")).toBe(
      "/login?next=%2Fusers%2Fuser-1&notice=PROFILE_LOGIN_REQUIRED",
    );
  });

  it("returns login notice copy for profile access gate", () => {
    expect(getPublicProfileLoginNoticeMessage("PROFILE_LOGIN_REQUIRED")).toBe(
      "프로필을 보려면 로그인해 주세요.",
    );
  });

  it("builds public profile tab hrefs for activity views", () => {
    expect(buildPublicProfileTabHref("user-1", "posts")).toBe("/users/user-1?tab=posts");
    expect(buildPublicProfileTabHref("user-1", "comments", 3)).toBe(
      "/users/user-1?tab=comments&page=3",
    );
  });

  it("lists only visible public profile tabs", () => {
    expect(
      getVisiblePublicProfileTabs({
        showPublicPosts: false,
        showPublicComments: true,
        showPublicPets: false,
      }),
    ).toEqual(["comments", "reactions"]);
  });

  it("falls back to the first visible tab when a hidden tab is requested", () => {
    expect(
      resolvePublicProfileTab("posts", {
        showPublicPosts: false,
        showPublicComments: false,
        showPublicPets: true,
      }),
    ).toBe("reactions");
  });
});
