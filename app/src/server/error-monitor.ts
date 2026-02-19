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

export async function monitorUnhandledError(error: unknown, context: ErrorContext) {
  const requestId = context.request ? getRequestId(context.request) : undefined;
  const clientIp = context.request ? getClientIp(context.request) : undefined;

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
