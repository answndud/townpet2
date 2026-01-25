import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportStatus, ReportTarget } from "@prisma/client";

import { bulkUpdateReports } from "@/server/services/report.service";
import { ServiceError } from "@/server/services/service-error";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(prisma);

describe("bulk report moderation", () => {
  beforeEach(() => {
    mockPrisma.$transaction.mockReset();
  });

  it("rejects hide action for non-post targets", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        report: {
          findMany: vi.fn().mockResolvedValue([
            { id: "r-1", targetType: ReportTarget.COMMENT, targetId: "c-1" },
          ]),
        },
      } as never),
    );

    await expect(
      bulkUpdateReports({
        input: { reportIds: ["r-1"], action: "HIDE_POST" },
        moderatorId: "mod-1",
      }),
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it("updates reports in bulk for resolve action", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const updatePosts = vi.fn();

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        report: {
          findMany: vi.fn().mockResolvedValue([
            { id: "r-2", targetType: ReportTarget.POST, targetId: "p-1" },
          ]),
          updateMany,
        },
        reportAudit: { createMany },
        post: { updateMany: updatePosts },
      } as never),
    );

    const result = await bulkUpdateReports({
      input: { reportIds: ["r-2"], action: "RESOLVE", resolution: "ok" },
      moderatorId: "mod-1",
    });

    expect(result).toEqual({ count: 1, status: ReportStatus.RESOLVED });
    expect(updateMany).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(updatePosts).not.toHaveBeenCalled();
  });
});
