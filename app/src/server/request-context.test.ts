import { afterEach, describe, expect, it, vi } from "vitest";

import { getClientIp } from "@/server/request-context";

function makeHeaders(entries: Record<string, string>) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(entries)) {
    headers.set(key, value);
  }
  return headers;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getClientIp", () => {
  it("returns anonymous when no forwarding headers exist", () => {
    const headers = makeHeaders({});

    expect(getClientIp(headers)).toBe("anonymous");
  });

  it("uses x-real-ip when x-forwarded-for is absent", () => {
    const headers = makeHeaders({ "x-real-ip": "203.0.113.10" });

    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("uses first x-forwarded-for entry in development by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");

    const headers = makeHeaders({
      "x-forwarded-for": "198.51.100.20, 203.0.113.5",
    });

    expect(getClientIp(headers)).toBe("198.51.100.20");
  });

  it("uses right-adjusted client IP in production with trusted proxy fallback", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");

    const headers = makeHeaders({
      "x-forwarded-for": "1.1.1.1, 198.51.100.20, 203.0.113.5",
    });

    expect(getClientIp(headers)).toBe("198.51.100.20");
  });

  it("respects explicit TRUSTED_PROXY_HOPS override", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");

    const headers = makeHeaders({
      "x-forwarded-for": "10.0.0.1, 198.51.100.20, 203.0.113.5, 203.0.113.6",
    });

    expect(getClientIp(headers)).toBe("198.51.100.20");
  });
});
