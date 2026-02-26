import type { NextRequest } from "next/server";

import { getClientIp, getRequestId } from "@/server/request-context";
import { logger, serializeError } from "@/server/logger";
import { captureException } from "@/server/sentry";

type ErrorContext = {
  route: string;
  request?: NextRequest;
  userId?: string;
  extra?: Record<string, unknown>;
};

function maskClientIp(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  if (value.includes(":")) {
    const parts = value.split(":").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts.slice(0, 2).join(":")}::`;
    }
  }

  return value;
}

export async function monitorUnhandledError(error: unknown, context: ErrorContext) {
  const requestId = context.request ? getRequestId(context.request) : undefined;
  const clientIp = context.request ? maskClientIp(getClientIp(context.request)) : undefined;

  logger.error("Unhandled API error", {
    route: context.route,
    requestId,
    clientIp,
    userId: context.userId,
    error: serializeError(error),
    ...(context.extra ?? {}),
  });

  await captureException(error, {
    route: context.route,
    requestId,
    clientIp,
    userId: context.userId,
    ...(context.extra ?? {}),
  });
}
