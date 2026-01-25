import { z } from "zod";

export const reportBulkActionSchema = z.object({
  reportIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["RESOLVE", "DISMISS", "HIDE_POST", "UNHIDE_POST"]),
  resolution: z.string().min(1).max(500).optional(),
});

export type ReportBulkActionInput = z.infer<typeof reportBulkActionSchema>;
