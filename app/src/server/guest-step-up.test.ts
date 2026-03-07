import { describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";

import {
  assertGuestStepUp,
  issueGuestStepUpChallenge,
} from "@/server/guest-step-up";

vi.mock("@/server/services/guest-safety.service", () => ({
  registerGuestViolation: vi.fn().mockResolvedValue(undefined),
}));

function solveProof(token: string, difficulty: number) {
  const targetPrefix = "0".repeat(difficulty);
  let nonce = 0;
  while (true) {
    const candidate = nonce.toString(36);
    const digest = createHash("sha256").update(`${token}.${candidate}`).digest("hex");
    if (digest.startsWith(targetPrefix)) {
      return candidate;
    }
    nonce += 1;
  }
}

describe("guest step-up", () => {
  it("raises difficulty for automation-like guest signals", () => {
    const challenge = issueGuestStepUpChallenge({
      scope: "post:create",
      ip: "127.0.0.1",
      fingerprint: "",
      userAgent: "curl/8.0",
      forwardedFor: "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4",
      acceptLanguage: "",
      now: new Date("2026-03-07T00:00:00.000Z"),
    });

    expect(challenge.riskLevel).toBe("HIGH");
    expect(challenge.difficulty).toBe(4);
    expect(challenge.signalLabels).toContain("자동화 UA");
  });

  it("accepts a valid proof for the same identity and scope", async () => {
    const now = new Date("2026-03-07T00:00:00.000Z");
    const challenge = issueGuestStepUpChallenge({
      scope: "comment:create",
      ip: "127.0.0.1",
      fingerprint: "guest-fp-1",
      userAgent: "Mozilla/5.0",
      forwardedFor: "127.0.0.1",
      acceptLanguage: "ko-KR",
      now,
    });

    const proof = solveProof(challenge.token, challenge.difficulty);

    await expect(
      assertGuestStepUp({
        scope: "comment:create",
        ip: "127.0.0.1",
        fingerprint: "guest-fp-1",
        token: challenge.token,
        proof,
        now,
      }),
    ).resolves.toMatchObject({
      difficulty: challenge.difficulty,
    });
  });

  it("rejects missing proof as step-up required", async () => {
    await expect(
      assertGuestStepUp({
        scope: "upload",
        ip: "127.0.0.1",
        fingerprint: "guest-fp-2",
      }),
    ).rejects.toMatchObject({
      code: "GUEST_STEP_UP_REQUIRED",
      status: 428,
    });
  });
});
