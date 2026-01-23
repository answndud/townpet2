import { NextRequest } from "next/server";

import { getUserByEmail } from "@/server/queries/user.queries";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { createReport } from "@/server/services/report.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
    enforceRateLimit({ key: `reports:${email}`, limit: 3, windowMs: 60_000 });
    const user = await getUserByEmail(email);

    if (!user) {
      return jsonError(404, {
        code: "USER_NOT_FOUND",
        message: "작성자 정보를 찾을 수 없습니다.",
      });
    }

    const report = await createReport({ reporterId: user.id, input: body });
    return jsonOk(report, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
