import { describe, expect, it } from "vitest";

import { buildLoginRateLimitRules } from "@/server/auth-login-rate-limit";

describe("buildLoginRateLimitRules", () => {
  it("returns multi-window rules keyed by ip and hashed account", () => {
    const rules = buildLoginRateLimitRules({
      email: "User@TownPet.dev ",
      clientIp: "203.0.113.5",
    });

    expect(rules).toHaveLength(3);
    expect(rules[0]).toMatchObject({
      key: "auth:login:ip:203.0.113.5",
      limit: 10,
      windowMs: 60_000,
    });
    expect(rules[1]?.key).toContain("auth:login:account-ip:");
    expect(rules[1]?.key).toContain(":203.0.113.5");
    expect(rules[1]?.limit).toBe(5);
    expect(rules[1]?.windowMs).toBe(15 * 60_000);
    expect(rules[2]?.key).toContain("auth:login:account:");
    expect(rules[2]?.limit).toBe(30);
    expect(rules[2]?.windowMs).toBe(24 * 60 * 60_000);
  });

  it("normalizes email before hashing", () => {
    const a = buildLoginRateLimitRules({
      email: "User@TownPet.dev",
      clientIp: "203.0.113.9",
    });
    const b = buildLoginRateLimitRules({
      email: " user@townpet.dev ",
      clientIp: "203.0.113.9",
    });

    expect(a[1]?.key).toBe(b[1]?.key);
    expect(a[2]?.key).toBe(b[2]?.key);
  });
});
