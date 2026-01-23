import { z } from "zod";

export const commentCreateSchema = z.object({
  content: z.string().min(1).max(1000),
});

export const commentUpdateSchema = z.object({
  content: z.string().min(1).max(1000),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;
