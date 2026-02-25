import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  emailVerificationConfirmSchema,
  emailVerificationRequestSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  passwordSetupSchema,
  registerSchema,
} from "@/lib/validations/auth";
import { hashPassword, hashToken, verifyPassword } from "@/server/password";
import { ServiceError } from "@/server/services/service-error";

type RegisterUserParams = {
  input: unknown;
};

export async function registerUser({ input }: RegisterUserParams) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("회원가입 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existing) {
    throw new ServiceError("이미 사용 중인 이메일입니다.", "EMAIL_TAKEN", 409);
  }

  const existingNickname = await prisma.user.findUnique({
    where: { nickname: parsed.data.nickname },
    select: { id: true },
  });

  if (existingNickname) {
    throw new ServiceError("이미 사용 중인 닉네임입니다.", "NICKNAME_TAKEN", 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    return await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name ?? null,
        nickname: parsed.data.nickname,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target)
        ? error.meta.target.map((value) => String(value))
        : [];

      if (targets.includes("nickname")) {
        throw new ServiceError("이미 사용 중인 닉네임입니다.", "NICKNAME_TAKEN", 409);
      }

      if (targets.includes("email")) {
        throw new ServiceError("이미 사용 중인 이메일입니다.", "EMAIL_TAKEN", 409);
      }
    }

    throw error;
  }
}

type EmailVerificationRequestParams = {
  input: unknown;
};

export async function requestEmailVerification({
  input,
}: EmailVerificationRequestParams) {
  const parsed = emailVerificationRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, emailVerified: true },
  });

  if (!user || user.emailVerified) {
    return { token: null } as const;
  }

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: parsed.data.email,
      OR: [{ expires: { lt: new Date() } }],
    },
  });

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: parsed.data.email,
      token: tokenHash,
      expires,
    },
  });

  return { token } as const;
}

type EmailVerificationConfirmParams = {
  input: unknown;
};

export async function confirmEmailVerification({
  input,
}: EmailVerificationConfirmParams) {
  const parsed = emailVerificationConfirmSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const tokenHash = hashToken(parsed.data.token);
  const tokenEntry = await prisma.verificationToken.findFirst({
    where: { token: tokenHash, expires: { gt: new Date() } },
    select: { identifier: true },
  });

  if (!tokenEntry) {
    throw new ServiceError("유효하지 않거나 만료된 토큰입니다.", "INVALID_TOKEN", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: tokenEntry.identifier },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  await prisma.verificationToken.deleteMany({
    where: { identifier: tokenEntry.identifier },
  });

  return { email: tokenEntry.identifier } as const;
}

type SetPasswordParams = {
  userId: string;
  input: unknown;
  meta?: {
    ipAddress?: string;
    userAgent?: string;
  };
};

export async function setPasswordForUser({ userId, input, meta }: SetPasswordParams) {
  const parsed = passwordSetupSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("비밀번호 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  const hadPassword = Boolean(user.passwordHash);

  if (hadPassword) {
    const currentPasswordHash = user.passwordHash;
    if (!parsed.data.currentPassword) {
      throw new ServiceError(
        "현재 비밀번호를 입력해 주세요.",
        "CURRENT_PASSWORD_REQUIRED",
        400,
      );
    }

    if (!currentPasswordHash) {
      throw new ServiceError("현재 비밀번호 정보가 없습니다.", "INVALID_PASSWORD", 400);
    }

    const isValid = await verifyPassword(
      parsed.data.currentPassword,
      currentPasswordHash,
    );
    if (!isValid) {
      throw new ServiceError("현재 비밀번호가 올바르지 않습니다.", "INVALID_PASSWORD", 401);
    }
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await tx.authAuditLog.create({
      data: {
        userId,
        action: hadPassword ? "PASSWORD_CHANGE" : "PASSWORD_SET",
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
  });
}

type PasswordResetRequestParams = {
  input: unknown;
};

export async function requestPasswordReset({ input }: PasswordResetRequestParams) {
  const parsed = passwordResetRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (!user) {
    return { token: null } as const;
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
    },
  });

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { token } as const;
}

type PasswordResetConfirmParams = {
  input: unknown;
  meta?: {
    ipAddress?: string;
    userAgent?: string;
  };
};

export async function confirmPasswordReset({ input, meta }: PasswordResetConfirmParams) {
  const parsed = passwordResetConfirmSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const tokenHash = hashToken(parsed.data.token);
  const tokenEntry = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (!tokenEntry) {
    throw new ServiceError("유효하지 않거나 만료된 토큰입니다.", "INVALID_TOKEN", 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: tokenEntry.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: tokenEntry.id },
      data: { usedAt: new Date() },
    });
    await tx.authAuditLog.create({
      data: {
        userId: tokenEntry.userId,
        action: "PASSWORD_RESET",
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
    await tx.passwordResetToken.deleteMany({
      where: {
        userId: tokenEntry.userId,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    });
  });
}
