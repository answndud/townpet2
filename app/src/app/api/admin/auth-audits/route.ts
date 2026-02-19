import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthAuditAction, UserRole } from "@prisma/client";

import { getCurrentUser } from "@/server/auth";
import { listAuthAuditLogs } from "@/server/queries/auth-audit.queries";
import { jsonError, jsonOk } from "@/server/response";

const querySchema = z.object({
  action: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(401, { code: "AUTH_REQUIRED", message: "로그인이 필요합니다." });
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
    return jsonError(403, { code: "FORBIDDEN", message: "권한이 없습니다." });
  }

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
}
