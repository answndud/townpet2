import { NextRequest } from "next/server";

import { getUserByEmail } from "@/server/queries/user.queries";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { updateReport } from "@/server/services/report.service";

type RouteParams = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
    const user = await getUserByEmail(email);

    if (!user) {
      return jsonError(404, {
        code: "USER_NOT_FOUND",
        message: "관리자 정보를 찾을 수 없습니다.",
      });
    }

    const report = await updateReport({
      reportId: params.id,
      input: body,
      moderatorId: user.id,
    });
    return jsonOk(report);
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
