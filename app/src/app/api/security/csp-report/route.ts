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
