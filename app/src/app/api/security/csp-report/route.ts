import { NextRequest, NextResponse } from "next/server";

import { monitorUnhandledError } from "@/server/error-monitor";
import { logger } from "@/server/logger";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

type CspReportBody = {
  "document-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  disposition?: string;
  "blocked-uri"?: string;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
  "status-code"?: number;
};

type CspReportStat = {
  key: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  sample: ReturnType<typeof sanitizeCspReport>;
};

const MAX_CSP_STAT_BUCKETS = 300;
const cspReportStats = new Map<string, CspReportStat>();

function safeString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.slice(0, 512);
}

function sanitizeCspReport(body: unknown) {
  const payload =
    body && typeof body === "object" && "csp-report" in body
      ? (body as { "csp-report"?: CspReportBody })["csp-report"]
      : body;

  const report = (payload ?? {}) as CspReportBody;

  return {
    documentUri: safeString(report["document-uri"]),
    violatedDirective: safeString(report["violated-directive"]),
    effectiveDirective: safeString(report["effective-directive"]),
    disposition: safeString(report.disposition),
    blockedUri: safeString(report["blocked-uri"]),
    sourceFile: safeString(report["source-file"]),
    lineNumber:
      typeof report["line-number"] === "number" ? report["line-number"] : undefined,
    columnNumber:
      typeof report["column-number"] === "number"
        ? report["column-number"]
        : undefined,
    statusCode:
      typeof report["status-code"] === "number" ? report["status-code"] : undefined,
  };
}

function toStatKey(report: ReturnType<typeof sanitizeCspReport>) {
  return [
    report.effectiveDirective ?? report.violatedDirective ?? "unknown",
    report.blockedUri ?? "unknown",
    report.documentUri ?? "unknown",
  ].join("|");
}

function trackCspReportStat(report: ReturnType<typeof sanitizeCspReport>) {
  const now = new Date().toISOString();
  const key = toStatKey(report);
  const existing = cspReportStats.get(key);

  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = now;
    return;
  }

  if (cspReportStats.size >= MAX_CSP_STAT_BUCKETS) {
    const oldest = [...cspReportStats.values()].sort(
      (a, b) => a.lastSeenAt.localeCompare(b.lastSeenAt),
    )[0];
    if (oldest) {
      cspReportStats.delete(oldest.key);
    }
  }

  cspReportStats.set(key, {
    key,
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
    sample: report,
  });
}

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

function isAuthorizedInternalRequest(request: NextRequest) {
  const configuredToken = process.env.HEALTH_INTERNAL_TOKEN?.trim();
  if (!configuredToken) {
    return process.env.NODE_ENV !== "production";
  }

  const tokenFromHeader = request.headers.get("x-health-token")?.trim() ?? "";
  const tokenFromBearer = resolveBearerToken(request.headers.get("authorization"));
  const providedToken = tokenFromHeader || tokenFromBearer;

  return providedToken.length > 0 && providedToken === configuredToken;
}

function getTopCspStats(limit = 30) {
  return [...cspReportStats.values()]
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.lastSeenAt.localeCompare(a.lastSeenAt);
    })
    .slice(0, limit)
    .map((entry) => ({
      key: entry.key,
      count: entry.count,
      firstSeenAt: entry.firstSeenAt,
      lastSeenAt: entry.lastSeenAt,
      sample: entry.sample,
    }));
}

export function __resetCspReportStatsForTest() {
  cspReportStats.clear();
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "접근 권한이 없습니다.",
        },
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      totalBuckets: cspReportStats.size,
      top: getTopCspStats(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `security:csp-report:${clientIp}`,
      limit: 60,
      windowMs: 60_000,
    });

    const body = await request.json().catch(() => null);
    const report = sanitizeCspReport(body);
    trackCspReportStat(report);

    logger.warn("CSP violation report", {
      clientIp,
      report,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await monitorUnhandledError(error, { route: "POST /api/security/csp-report", request });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "서버 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
