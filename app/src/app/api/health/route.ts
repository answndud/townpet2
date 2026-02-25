import { NextResponse } from "next/server";

import { runtimeEnv, validateRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";
import { checkRateLimitHealth } from "@/server/rate-limit";

type CheckState = "ok" | "error";

function resolveBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return "";
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
}

function shouldIncludeDetailedHealth(request: Request) {
  const internalToken = runtimeEnv.healthInternalToken.trim();

  if (!internalToken) {
    return !runtimeEnv.isProduction;
  }

  const tokenFromHeader = request.headers.get("x-health-token")?.trim() ?? "";
  const tokenFromBearer = resolveBearerToken(request.headers.get("authorization"));
  const providedToken = tokenFromHeader || tokenFromBearer;

  return providedToken.length > 0 && providedToken === internalToken;
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const envValidation = validateRuntimeEnv();
  const includeDetailedHealth = shouldIncludeDetailedHealth(request);

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
        ...(includeDetailedHealth ? { missing: envValidation.missing } : {}),
      },
      checks: {
        database: {
          state: dbState,
          ...(includeDetailedHealth ? { message: dbMessage } : {}),
        },
        rateLimit: includeDetailedHealth
          ? rateLimitState
          : {
              backend: rateLimitState.backend,
              status: rateLimitState.status,
            },
      },
    },
    { status: httpStatus },
  );
}
