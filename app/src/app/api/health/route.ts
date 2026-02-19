import { NextResponse } from "next/server";

import { runtimeEnv, validateRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";
import { checkRateLimitHealth } from "@/server/rate-limit";

type CheckState = "ok" | "error";

export async function GET() {
  const startedAt = Date.now();
  const envValidation = validateRuntimeEnv();

  let dbState: CheckState = "ok";
  let dbMessage = "database connected";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbState = "error";
    dbMessage = `database check failed: ${String(error)}`;
  }

  const rateLimitState = await checkRateLimitHealth();
  const envState: CheckState = envValidation.ok ? "ok" : "error";
  const status =
    dbState === "ok" && envState === "ok" && rateLimitState.status !== "error"
      ? "ok"
      : "degraded";
  const httpStatus = status === "ok" ? 200 : 503;

  if (status !== "ok") {
    logger.warn("Health check degraded", {
      envMissing: envValidation.missing,
      dbState,
      dbMessage,
      rateLimitState,
    });
  }

  return NextResponse.json(
    {
      ok: status === "ok",
      status,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      durationMs: Date.now() - startedAt,
      env: {
        nodeEnv: runtimeEnv.nodeEnv,
        state: envState,
        missing: envValidation.missing,
      },
      checks: {
        database: {
          state: dbState,
          message: dbMessage,
        },
        rateLimit: rateLimitState,
      },
    },
    { status: httpStatus },
  );
}
