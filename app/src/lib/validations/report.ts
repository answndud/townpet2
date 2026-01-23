import { ReportReason, ReportTarget } from "@prisma/client";
import { z } from "zod";

export const reportCreateSchema = z.object({
  targetType: z.nativeEnum(ReportTarget),
  targetId: z.string().cuid(),
  reason: z.nativeEnum(ReportReason),
  description: z.string().min(1).max(500).optional(),
});

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
