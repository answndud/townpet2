import { ReportReason, ReportTarget } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { reportCreateSchema } from "@/lib/validations/report";

describe("report validations", () => {
  it("accepts a valid report payload", () => {
    const result = reportCreateSchema.safeParse({
      targetType: ReportTarget.POST,
      targetId: "ckc7k5qsj0000u0t8qv6d1d7k",
      reason: ReportReason.SPAM,
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing reason", () => {
    const result = reportCreateSchema.safeParse({
      targetType: ReportTarget.POST,
      targetId: "ckc7k5qsj0000u0t8qv6d1d7k",
    });

    expect(result.success).toBe(false);
  });
});
