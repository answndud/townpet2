import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthAuditAction } from "@prisma/client";

import { requireModeratorUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import {
  AUTH_AUDIT_LOG_LIMIT_MAX,
  listAuthAuditLogs,
} from "@/server/queries/auth-audit.queries";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

const querySchema = z.object({
  action: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(AUTH_AUDIT_LOG_LIMIT_MAX).optional(),
});

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
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const action = Object.values(AuthAuditAction).includes(
      parsed.data.action as AuthAuditAction,
    )
      ? (parsed.data.action as AuthAuditAction)
      : null;

    const audits = await listAuthAuditLogs({
      action,
      query: parsed.data.q ?? null,
      limit: parsed.data.limit,
    });

    return jsonOk(audits);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "GET /api/admin/auth-audits",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
