import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnvModule() {
  vi.resetModules();
  return import("@/lib/env");
}

describe("env security validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("requires production security envs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://db");
    vi.stubEnv("AUTH_SECRET", "x".repeat(48));
    vi.stubEnv("APP_BASE_URL", "https://townpet.dev");
    vi.stubEnv("CSP_ENFORCE_STRICT", "");
    vi.stubEnv("GUEST_HASH_PEPPER", "");
    vi.stubEnv("HEALTH_INTERNAL_TOKEN", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");

    const { validateRuntimeEnv } = await loadEnvModule();
    const result = validateRuntimeEnv();

    expect(result.ok).toBe(false);
    expect(result.missing).toContain("CSP_ENFORCE_STRICT");
    expect(result.missing).toContain("GUEST_HASH_PEPPER");
    expect(result.missing).toContain("HEALTH_INTERNAL_TOKEN");
    expect(result.missing).toContain("UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR");
    expect(result.missing).toContain("RESEND_API_KEY");
    expect(result.missing).toContain("BLOB_READ_WRITE_TOKEN");
  });

  it("enables social dev login only when explicitly opted in outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_SOCIAL_DEV_LOGIN", "1");

    const { isSocialDevLoginEnabled } = await loadEnvModule();

    expect(isSocialDevLoginEnabled()).toBe(true);
  });

  it("keeps social dev login disabled by default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_SOCIAL_DEV_LOGIN", "");

    const { isSocialDevLoginEnabled } = await loadEnvModule();

    expect(isSocialDevLoginEnabled()).toBe(false);
  });
});
