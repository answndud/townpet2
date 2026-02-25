import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/route";
import { validateRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { checkRateLimitHealth } from "@/server/rate-limit";

vi.mock("@/lib/env", () => ({
  runtimeEnv: {
    nodeEnv: "production",
    isProduction: true,
    healthInternalToken: "health-secret",
  },
  validateRuntimeEnv: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimitHealth: vi.fn(),
}));

vi.mock("@/server/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

const mockValidateRuntimeEnv = vi.mocked(validateRuntimeEnv);
const mockQueryRaw = vi.mocked(prisma.$queryRaw);
const mockCheckRateLimitHealth = vi.mocked(checkRateLimitHealth);

describe("GET /api/health", () => {
  beforeEach(() => {
    mockValidateRuntimeEnv.mockReset();
    mockQueryRaw.mockReset();
    mockCheckRateLimitHealth.mockReset();

    mockValidateRuntimeEnv.mockReturnValue({ ok: false, missing: ["AUTH_SECRET"] });
    mockQueryRaw.mockRejectedValue(new Error("db down: secret detail"));
    mockCheckRateLimitHealth.mockResolvedValue({
      backend: "redis",
      status: "error",
      detail: "Redis ping 예외: boom",
    });

  });

  it("hides detailed diagnostics on public request", async () => {
    const request = new Request("http://localhost/api/health");

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.status).toBe("degraded");
    expect(payload.env).toMatchObject({
      nodeEnv: "production",
      state: "error",
    });
    expect(payload.env.missing).toBeUndefined();
    expect(payload.checks.database).toMatchObject({ state: "error" });
    expect(payload.checks.database.message).toBeUndefined();
    expect(payload.checks.rateLimit).toEqual({
      backend: "redis",
      status: "error",
    });
  });

  it("includes detailed diagnostics with valid internal token", async () => {
    const request = new Request("http://localhost/api/health", {
      headers: {
        "x-health-token": "health-secret",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.env.missing).toEqual(["AUTH_SECRET"]);
    expect(payload.checks.database.message).toContain("db down");
    expect(payload.checks.rateLimit.detail).toContain("Redis ping 예외");
  });
});
