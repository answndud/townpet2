import { z } from "zod";

const breachedPasswordDenySet = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "asdf1234",
  "letmein",
  "11111111",
  "00000000",
  "admin1234",
]);

const loginPasswordSchema = z.string().min(1).max(72);

const strongPasswordSchema = z
  .string()
  .min(10, "비밀번호는 10자 이상이어야 합니다.")
  .max(72, "비밀번호는 72자 이하여야 합니다.")
  .superRefine((password, ctx) => {
    if (!/[a-z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "비밀번호에 영문 소문자를 포함해 주세요.",
      });
    }

    if (!/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "비밀번호에 영문 대문자를 포함해 주세요.",
      });
    }

    if (!/\d/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "비밀번호에 숫자를 포함해 주세요.",
      });
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "비밀번호에 특수문자를 포함해 주세요.",
      });
    }

    const normalized = password.trim().toLowerCase();
    if (breachedPasswordDenySet.has(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "이미 널리 알려진 취약한 비밀번호는 사용할 수 없습니다.",
      });
    }

    if (/(.)\1{3,}/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "같은 문자를 반복한 비밀번호는 사용할 수 없습니다.",
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: loginPasswordSchema,
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: strongPasswordSchema,
  nickname: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9가-힣_-]+$/, "닉네임은 한글/영문/숫자/특수기호(-,_)만 가능합니다."),
  name: z.string().min(1).max(40).optional(),
});

export const passwordSetupSchema = z.object({
  currentPassword: loginPasswordSchema.optional(),
  password: strongPasswordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(32),
  password: strongPasswordSchema,
});

export const emailVerificationRequestSchema = z.object({
  email: z.string().email(),
});

export const emailVerificationConfirmSchema = z.object({
  token: z.string().min(32),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordSetupInput = z.infer<typeof passwordSetupSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerificationRequestInput = z.infer<
  typeof emailVerificationRequestSchema
>;
export type EmailVerificationConfirmInput = z.infer<
  typeof emailVerificationConfirmSchema
>;
