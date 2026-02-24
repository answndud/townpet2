import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthAuditAction, UserRole } from "@prisma/client";

import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
  AUTH_AUDIT_LOG_LIMIT_MAX,
  listAuthAuditLogs,
} from "@/server/queries/auth-audit.queries";

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "AUTH_REQUIRED", message: "로그인이 필요합니다." } }, { status: 401 });
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
      return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 });
    }

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
