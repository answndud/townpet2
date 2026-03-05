import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthAuditAction } from "@prisma/client";

import { requireModeratorUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
  AUTH_AUDIT_LOG_LIMIT_MAX,
  listAuthAuditLogs,
} from "@/server/queries/auth-audit.queries";
import { ServiceError } from "@/server/services/service-error";

const querySchema = z.object({
  action: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(AUTH_AUDIT_LOG_LIMIT_MAX).optional(),
});

function toCsvValue(value: string | null) {
  if (!value) {
    return "";
  }
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: NextRequest) {
  try {
    await requireModeratorUserId();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      action: searchParams.get("action") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_QUERY", message: "잘못된 요청 파라미터입니다." } },
        { status: 400 },
      );
    }

    const action = Object.values(AuthAuditAction).includes(
      parsed.data.action as AuthAuditAction,
    )
      ? (parsed.data.action as AuthAuditAction)
      : null;

    const audits = await listAuthAuditLogs({
      action,
      query: parsed.data.q ?? null,
      limit: parsed.data.limit ?? AUTH_AUDIT_LOG_LIMIT_MAX,
    });

    const header = [
      "action",
      "userId",
      "email",
      "nickname",
      "ipAddress",
      "userAgent",
      "createdAt",
    ].join(",");

    const rows = audits.map((audit) =>
      [
        audit.action,
        audit.userId,
        audit.user.email ?? "",
        audit.user.nickname ?? "",
        audit.ipAddress ?? "",
        audit.userAgent ?? "",
        audit.createdAt.toISOString(),
      ]
        .map(toCsvValue)
        .join(","),
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=auth-audit-logs.csv",
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    await monitorUnhandledError(error, {
      route: "GET /api/admin/auth-audits/export",
      request,
    });
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_SERVER_ERROR", message: "서버 오류가 발생했습니다." } },
      { status: 500 },
    );
  }
}
