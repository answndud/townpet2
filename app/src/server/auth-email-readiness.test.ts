import { describe, expect, it } from "vitest";

import { assessAuthEmailReadiness } from "@/server/auth-email-readiness";

describe("assessAuthEmailReadiness", () => {
  it("fails when two users collide under trim+lowercase email normalization", () => {
    const report = assessAuthEmailReadiness({
      users: [
        { id: "user-1", email: "User@TownPet.dev" },
        { id: "user-2", email: " user@townpet.dev " },
      ],
      verificationTokens: [],
    });

    expect(report.status).toBe("FAIL");
    expect(report.duplicateEmailGroups).toEqual([
      {
        normalizedEmail: "user@townpet.dev",
        users: [
          { id: "user-1", email: "User@TownPet.dev" },
          { id: "user-2", email: " user@townpet.dev " },
        ],
      },
    ]);
  });

  it("warns when values are unique but will be normalized during migration", () => {
    const report = assessAuthEmailReadiness({
      users: [{ id: "user-1", email: "User@TownPet.dev" }],
      verificationTokens: [
        {
          token: "token-1",
          identifier: " Verify@TownPet.dev ",
        },
      ],
    });

    expect(report.status).toBe("WARN");
    expect(report.userEmailNormalizationDrift).toEqual([
      {
        id: "user-1",
        currentValue: "User@TownPet.dev",
        normalizedValue: "user@townpet.dev",
      },
    ]);
    expect(report.verificationIdentifierNormalizationDrift).toEqual([
      {
        token: "token-1",
        currentValue: " Verify@TownPet.dev ",
        normalizedValue: "verify@townpet.dev",
      },
    ]);
  });

  it("passes when auth emails are already normalized and unique", () => {
    const report = assessAuthEmailReadiness({
      users: [{ id: "user-1", email: "user@townpet.dev" }],
      verificationTokens: [
        {
          token: "token-1",
          identifier: "verify@townpet.dev",
        },
      ],
    });

    expect(report.status).toBe("PASS");
    expect(report.duplicateEmailGroups).toHaveLength(0);
    expect(report.userEmailNormalizationDrift).toHaveLength(0);
    expect(report.verificationIdentifierNormalizationDrift).toHaveLength(0);
    expect(report.invalidUserEmails).toHaveLength(0);
    expect(report.invalidVerificationIdentifiers).toHaveLength(0);
  });
});
