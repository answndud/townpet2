import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportReason, ReportStatus, ReportTarget } from "@prisma/client";

import { getReportStats } from "@/server/queries/report.queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma);

describe("report stats", () => {
  beforeEach(() => {
    mockPrisma.$transaction.mockReset();
    (mockPrisma as typeof prisma & {
      report: {
        count: ReturnType<typeof vi.fn>;
        groupBy: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
      };
    }).report = {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));
  });

  it("aggregates counts and average resolution", async () => {
    const recentReports = [
      { createdAt: new Date("2026-01-23T10:00:00Z") },
      { createdAt: new Date("2026-01-25T08:00:00Z") },
    ];
    const resolvedReports = [
      {
        createdAt: new Date("2026-01-24T08:00:00Z"),
        resolvedAt: new Date("2026-01-24T10:00:00Z"),
      },
      {
        createdAt: new Date("2026-01-25T06:00:00Z"),
        resolvedAt: new Date("2026-01-25T10:00:00Z"),
      },
    ];

    mockPrisma.$transaction.mockResolvedValue([
      4,
      [
        { status: ReportStatus.PENDING, _count: { _all: 2 } },
        { status: ReportStatus.RESOLVED, _count: { _all: 1 } },
        { status: ReportStatus.DISMISSED, _count: { _all: 1 } },
      ],
      [
        { reason: ReportReason.SPAM, _count: { _all: 2 } },
        { reason: ReportReason.OTHER, _count: { _all: 2 } },
      ],
      [
        { targetType: ReportTarget.POST, _count: { _all: 3 } },
        { targetType: ReportTarget.COMMENT, _count: { _all: 1 } },
      ],
      recentReports,
      resolvedReports,
    ] as never);

    const stats = await getReportStats(7);

    expect(stats.totalCount).toBe(4);
    expect(stats.statusCounts[ReportStatus.PENDING]).toBe(2);
    expect(stats.statusCounts[ReportStatus.RESOLVED]).toBe(1);
    expect(stats.statusCounts[ReportStatus.DISMISSED]).toBe(1);
    expect(stats.reasonCounts[ReportReason.SPAM]).toBe(2);
    expect(stats.targetCounts[ReportTarget.POST]).toBe(3);
    expect(stats.dailyCounts.length).toBeGreaterThanOrEqual(7);
    expect(stats.dailyCounts.reduce((sum, item) => sum + item.count, 0)).toBe(2);
    expect(stats.averageResolutionHours).toBeCloseTo(3, 2);
  });
});
