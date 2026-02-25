import { describe, expect, it } from "vitest";

import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordSetupSchema,
  registerSchema,
} from "@/lib/validations/auth";

describe("auth password validation", () => {
  it("accepts strong password for register/setup/reset", () => {
    const password = "Townpet!2026";

    expect(
      registerSchema.safeParse({
        email: "user@townpet.dev",
        password,
        nickname: "tester01",
      }).success,
    ).toBe(true);

    expect(
      passwordSetupSchema.safeParse({
        currentPassword: "old-password",
        password,
      }).success,
    ).toBe(true);

    expect(
      passwordResetConfirmSchema.safeParse({
        token: "a".repeat(32),
        password,
      }).success,
    ).toBe(true);
  });

  it("rejects weak password lacking complexity", () => {
    const parsed = registerSchema.safeParse({
      email: "user@townpet.dev",
      password: "onlylowercase",
      nickname: "tester02",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects breached deny-list password", () => {
    const parsed = registerSchema.safeParse({
      email: "user@townpet.dev",
      password: "Password123",
      nickname: "tester03",
    });

    expect(parsed.success).toBe(false);
  });

  it("keeps login schema compatible with existing passwords", () => {
    const parsed = loginSchema.safeParse({
      email: "user@townpet.dev",
      password: "weakpass",
    });

    expect(parsed.success).toBe(true);
  });
});
