import { describe, expect, it } from "vitest";

import {
  hashLoginIdentifierEmail,
  maskLoginIdentifierEmail,
  normalizeLoginIdentifierEmail,
} from "@/server/auth-login-identifier";

describe("auth login identifier helpers", () => {
  it("normalizes email identifiers", () => {
    expect(normalizeLoginIdentifierEmail("  USER@TownPet.dev ")).toBe("user@townpet.dev");
  });

  it("hashes missing identifiers to a stable fallback", () => {
    expect(hashLoginIdentifierEmail("")).toBe(hashLoginIdentifierEmail("unknown"));
  });

  it("masks email identifiers for operator display", () => {
    expect(maskLoginIdentifierEmail("alpha@example.dev")).toBe("al***@ex***.dev");
  });
});
