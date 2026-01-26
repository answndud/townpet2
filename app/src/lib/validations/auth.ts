import { z } from "zod";

const passwordSchema = z.string().min(8).max(72);

export const loginSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(40).optional(),
});

export const passwordSetupSchema = z.object({
  currentPassword: passwordSchema.optional(),
  password: passwordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(32),
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordSetupInput = z.infer<typeof passwordSetupSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
