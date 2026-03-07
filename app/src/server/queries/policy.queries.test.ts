import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";

vi.mock("@/server/cache/query-cache", async () => {
  const actual = await vi.importActual<typeof import("@/server/cache/query-cache")>(
    "@/server/cache/query-cache",
  );

  return {
    ...actual,
    createQueryCacheKey: vi.fn(async () => "cache:policy"),
    withQueryCache: vi.fn(async ({ fetcher }: { fetcher: () => Promise<unknown> }) => fetcher()),
    bumpCacheVersion: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  siteSetting?: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("policy queries", () => {
  beforeEach(() => {
    mockPrisma.siteSetting = {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    };
  });

  it("fails closed when SiteSetting delegate is missing", async () => {
    delete mockPrisma.siteSetting;

    await expect(getGuestReadLoginRequiredPostTypes()).rejects.toMatchObject({
      code: "SCHEMA_SYNC_REQUIRED",
      status: 503,
    });
  });
});
