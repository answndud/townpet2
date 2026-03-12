import { describe, expect, it } from "vitest";

import { buildPostStructuredSearchText } from "@/lib/post-structured-search";

describe("buildPostStructuredSearchText", () => {
  it("flattens structured post fields into a single normalized search document", () => {
    expect(
      buildPostStructuredSearchText({
        animalTags: ["강아지", "  산책  "],
        hospitalReview: {
          hospitalName: "  해피 동물 병원 ",
          treatmentType: "중성화 수술",
        },
        adoptionListing: {
          shelterName: " 서울 보호 센터 ",
          region: "서울 마포",
          breed: "웰시 코기",
        },
      }),
    ).toBe("강아지 산책 해피 동물 병원 중성화 수술 서울 보호 센터 서울 마포 웰시 코기");
  });

  it("returns an empty string when there is no structured content", () => {
    expect(buildPostStructuredSearchText({})).toBe("");
  });
});
