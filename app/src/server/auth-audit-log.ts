import { AuthAuditAction } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  hashLoginIdentifierEmail,
  maskLoginIdentifierEmail,
  normalizeLoginIdentifierEmail,
} from "@/server/auth-login-identifier";
import { logger, serializeError } from "@/server/logger";

const MAX_IP_ADDRESS_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;
const MAX_REASON_CODE_LENGTH = 64;

type RecordAuthAuditEventParams = {
  action: AuthAuditAction;
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  reasonCode?: string | null;
};

function normalizeIpAddress(value: string | null | undefined) {
  return value?.trim().slice(0, MAX_IP_ADDRESS_LENGTH) || null;
}

function normalizeUserAgent(value: string | null | undefined) {
  return value?.trim().slice(0, MAX_USER_AGENT_LENGTH) || null;
}

function normalizeReasonCode(value: string | null | undefined) {
  return value?.trim().slice(0, MAX_REASON_CODE_LENGTH) || null;
}

export async function recordAuthAuditEvent({
  action,
  userId,
  email,
  ipAddress,
  userAgent,
  reasonCode,
}: RecordAuthAuditEventParams) {
  const normalizedEmail = normalizeLoginIdentifierEmail(email);

  try {
    await prisma.authAuditLog.create({
      data: {
        userId: userId ?? null,
        identifierHash: normalizedEmail ? hashLoginIdentifierEmail(normalizedEmail) : null,
        identifierLabel: normalizedEmail ? maskLoginIdentifierEmail(normalizedEmail) : null,
        action,
        reasonCode: normalizeReasonCode(reasonCode),
        ipAddress: normalizeIpAddress(ipAddress),
        userAgent: normalizeUserAgent(userAgent),
      },
    });
  } catch (error) {
    logger.warn("Auth audit log write failed.", {
      action,
      reasonCode: normalizeReasonCode(reasonCode),
      error: serializeError(error),
    });
  }
}
