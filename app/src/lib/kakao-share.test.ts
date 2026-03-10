import { describe, expect, it } from "vitest";

import { buildKakaoShareText, resolveKakaoShareErrorMessage } from "@/lib/kakao-share";

describe("kakao-share", () => {
  it("builds a compact text template payload from the post title", () => {
    const text = buildKakaoShareText("동네 산책 코스 추천해 주세요");

    expect(text).toContain("동네 산책 코스 추천해 주세요");
    expect(text).toContain("TownPet에서 자세히 보기");
    expect(text.length).toBeLessThanOrEqual(200);
  });

  it("truncates long titles to stay within Kakao text template limits", () => {
    const text = buildKakaoShareText("산책".repeat(80));

    expect(text.length).toBeLessThanOrEqual(200);
    expect(text).toContain("...");
    expect(text).toContain("TownPet에서 자세히 보기");
  });

  it("returns a configuration hint for invalid Kakao app keys", () => {
    expect(resolveKakaoShareErrorMessage({ code: 4011 })).toContain("4011");
    expect(
      resolveKakaoShareErrorMessage(new Error("카카오공유 요청 실패 (Error Code: 4011)")),
    ).toContain("JavaScript 키");
  });

  it("falls back to a generic message when no Kakao error code is present", () => {
    expect(resolveKakaoShareErrorMessage(new Error("boom"))).toBe(
      "카카오 공유를 열지 못했습니다. 링크 복사를 이용해 주세요.",
    );
  });
});
