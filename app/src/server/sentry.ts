import { randomUUID } from "crypto";

import { runtimeEnv } from "@/lib/env";
import { logger, serializeError } from "@/server/logger";

type SentryConfig = {
  host: string;
  projectId: string;
  publicKey: string;
};

type SentryContext = Record<string, unknown>;

function parseSentryDsn(dsn: string): SentryConfig | null {
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.split("/").filter(Boolean).pop();
    const publicKey = parsed.username;

    if (!projectId || !publicKey) {
      return null;
    }

    return {
      host: parsed.origin,
      projectId,
      publicKey,
    };
  } catch {
    return null;
  }
}

const sentryConfig = runtimeEnv.sentryDsn
  ? parseSentryDsn(runtimeEnv.sentryDsn)
  : null;

let hasWarnedInvalidConfig = false;

export async function captureException(error: unknown, context?: SentryContext) {
  if (!runtimeEnv.sentryDsn) {
    return;
  }

  if (!sentryConfig) {
    if (!hasWarnedInvalidConfig) {
      hasWarnedInvalidConfig = true;
      logger.warn("SENTRY_DSN 형식이 올바르지 않아 전송을 건너뜁니다.");
    }
    return;
  }

  const serializedError = serializeError(error);
  const eventId = randomUUID().replace(/-/g, "");
  const endpoint = `${sentryConfig.host}/api/${sentryConfig.projectId}/store/?sentry_version=7&sentry_key=${sentryConfig.publicKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        timestamp: Date.now() / 1000,
        platform: "javascript",
        level: "error",
        environment: runtimeEnv.nodeEnv,
        message:
          serializedError.message ??
          (typeof error === "string" ? error : "Unknown server error"),
        extra: context ?? {},
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      logger.warn("Sentry 이벤트 전송 실패", {
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (sendError) {
    logger.warn("Sentry 이벤트 전송 중 예외가 발생했습니다.", {
      error: serializeError(sendError),
    });
  } finally {
    clearTimeout(timeout);
  }
}
