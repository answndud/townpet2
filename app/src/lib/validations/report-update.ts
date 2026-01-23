import { ReportStatus } from "@prisma/client";
import { z } from "zod";

export const reportUpdateSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  resolution: z.string().min(1).max(500).optional(),
});

export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
