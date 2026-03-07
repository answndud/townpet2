import { describe, expect, it } from "vitest";

import {
  detectSensitiveSearchSignals,
  normalizeSearchTerm,
  shouldExcludeSearchTermFromStats,
} from "@/lib/search-term-privacy";

describe("search term privacy", () => {
  it("normalizes repeated whitespace for trackable terms", () => {
    expect(normalizeSearchTerm("  강아지   산책  ")).toBe("강아지 산책");
  });

  it("filters out direct contact patterns from search stats", () => {
    expect(detectSensitiveSearchSignals("test@example.com")).toContain("email");
    expect(detectSensitiveSearchSignals("010-1234-5678")).toContain("phone");
    expect(shouldExcludeSearchTermFromStats("https://open.kakao.com/o/test-room")).toBe(true);
  });

  it("keeps benign community queries trackable", () => {
    expect(shouldExcludeSearchTermFromStats("강아지 산책")).toBe(false);
    expect(detectSensitiveSearchSignals("동물병원 후기")).toEqual([]);
  });
});
