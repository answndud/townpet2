import { createHash } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hashGuestIdentity,
  hashGuestIdentityCandidates,
} from "@/server/services/guest-safety.service";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("guest identity hashing", () => {
  it("uses legacy sha256 hash when pepper is missing", () => {
    vi.stubEnv("GUEST_HASH_PEPPER", "");

    const hashed = hashGuestIdentity({
      ip: "127.0.0.1",
      fingerprint: "guest-fp-1",
    });

    expect(hashed.ipHash).toBe(sha256("127.0.0.1"));
    expect(hashed.fingerprintHash).toBe(sha256("guest-fp-1"));
  });

  it("prefers peppered hash and keeps legacy hash as fallback candidate", () => {
    vi.stubEnv("GUEST_HASH_PEPPER", "pepper-secret");

    const candidates = hashGuestIdentityCandidates({
      ip: "127.0.0.1",
      fingerprint: "guest-fp-1",
    });

    expect(candidates.ipHashes).toHaveLength(2);
    expect(candidates.ipHashes[1]).toBe(sha256("127.0.0.1"));
    expect(candidates.fingerprintHashes).toHaveLength(2);
    expect(candidates.fingerprintHashes[1]).toBe(sha256("guest-fp-1"));

    const hashed = hashGuestIdentity({
      ip: "127.0.0.1",
      fingerprint: "guest-fp-1",
    });
    expect(hashed.ipHash).toBe(candidates.ipHashes[0]);
    expect(hashed.fingerprintHash).toBe(candidates.fingerprintHashes[0]);
    expect(hashed.ipHash).not.toBe(sha256("127.0.0.1"));
  });
});
