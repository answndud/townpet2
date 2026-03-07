import { describe, expect, it } from "vitest";

import { buildFeedStatsLabel, getStableFeedDateLabel } from "@/lib/feed-list-presenter";

describe("getStableFeedDateLabel", () => {
  it("formats iso dates with dots for non-hydrated mobile feed rows", () => {
    expect(getStableFeedDateLabel("2026-03-07T12:00:00.000Z")).toBe("2026.03.07");
  });

  it("returns empty string for malformed dates", () => {
    expect(getStableFeedDateLabel("not-a-date")).toBe("");
  });
});

describe("buildFeedStatsLabel", () => {
  it("uses stable date labels when relative time has not initialized", () => {
    expect(
      buildFeedStatsLabel({
        createdAt: "2026-03-07T12:00:00.000Z",
        relativeNow: null,
        viewCount: 31,
        reactionCount: 4,
      }),
    ).toBe("2026.03.07 · 조회 31 · 반응 4");
  });

  it("omits invalid date fragments instead of rendering empty separators", () => {
    expect(
      buildFeedStatsLabel({
        createdAt: "bad-date",
        relativeNow: null,
        viewCount: 31,
        reactionCount: 4,
      }),
    ).toBe("조회 31 · 반응 4");
  });
});
