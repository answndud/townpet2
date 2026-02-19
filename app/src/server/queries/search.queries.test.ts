import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  getPopularSearchTerms,
  recordSearchTerm,
} from "@/server/queries/search.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    searchTermStat: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    siteSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  searchTermStat?: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  siteSetting: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("search queries", () => {
  beforeEach(() => {
    mockPrisma.searchTermStat?.findMany.mockReset();
    mockPrisma.searchTermStat?.upsert.mockReset();
    mockPrisma.siteSetting?.findUnique.mockReset();
    mockPrisma.siteSetting?.upsert.mockReset();
  });

  it("returns normalized popular search terms from SearchTermStat", async () => {
    mockPrisma.searchTermStat?.findMany.mockResolvedValue([
      { termDisplay: "산책" },
      { termDisplay: "  병원 후기 " },
      { termDisplay: "x" },
    ]);

    const terms = await getPopularSearchTerms(5);

    expect(terms).toEqual(["산책", "병원 후기"]);
  });

  it("records and increments search term in SearchTermStat", async () => {
    mockPrisma.searchTermStat?.upsert.mockResolvedValue({});

    const result = await recordSearchTerm("산책");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.searchTermStat?.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.searchTermStat?.upsert.mock.calls[0][0];
    expect(args.where.termNormalized).toBe("산책");
    expect(args.update.count).toEqual({ increment: 1 });
  });

  it("falls back to SiteSetting when SearchTermStat model is unavailable", async () => {
    const original = mockPrisma.searchTermStat;
    delete mockPrisma.searchTermStat;

    mockPrisma.siteSetting.findUnique.mockResolvedValue({
      value: [{ term: "산책", count: 2, updatedAt: "2026-02-19T00:00:00.000Z" }],
    });
    mockPrisma.siteSetting.upsert.mockResolvedValue({});

    const result = await recordSearchTerm("산책");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.siteSetting.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.siteSetting.upsert.mock.calls[0][0];
    expect(args.update.value[0].term).toBe("산책");
    expect(args.update.value[0].count).toBe(3);

    mockPrisma.searchTermStat = original;
  });

  it("rejects too short search term", async () => {
    const result = await recordSearchTerm("a");

    expect(result).toEqual({ ok: false, reason: "INVALID_TERM" });
    expect(mockPrisma.searchTermStat?.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.siteSetting?.upsert).not.toHaveBeenCalled();
  });
});
