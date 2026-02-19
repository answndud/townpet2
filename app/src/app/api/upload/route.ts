import { NextRequest } from "next/server";

import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { saveUploadedImage } from "@/server/upload";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `upload:user:${user.id}:ip:${clientIp}`,
      limit: 20,
      windowMs: 60_000,
    });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError(400, {
        code: "INVALID_FILE",
        message: "업로드할 파일이 필요합니다.",
      });
    }

    const uploaded = await saveUploadedImage(file);
    return jsonOk(uploaded, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/upload", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "이미지 업로드 중 오류가 발생했습니다.",
    });
  }
}
