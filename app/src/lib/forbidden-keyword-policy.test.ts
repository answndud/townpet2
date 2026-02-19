import { describe, expect, it } from "vitest";

import {
  findMatchedForbiddenKeywords,
  normalizeForbiddenKeywords,
} from "@/lib/forbidden-keyword-policy";

describe("forbidden keyword policy", () => {
  it("normalizes keyword list and removes duplicates", () => {
    const result = normalizeForbiddenKeywords([
      "  스팸  ",
      "스팸",
      "연락처",
      "",
      "a".repeat(41),
    ]);

    expect(result).toEqual(["스팸", "연락처"]);
  });

  it("supports empty list when allowEmpty option is set", () => {
    const result = normalizeForbiddenKeywords([""], ["fallback"], {
      allowEmpty: true,
    });

    expect(result).toEqual(["fallback"]);

    const explicitEmpty = normalizeForbiddenKeywords([], ["fallback"], {
      allowEmpty: true,
    });
    expect(explicitEmpty).toEqual([]);
  });

  it("matches keywords with whitespace evasion", () => {
    const result = findMatchedForbiddenKeywords("연 락 처 남겨요", [
      "연락처",
      "스팸",
    ]);

    expect(result).toEqual(["연락처"]);
  });
});
