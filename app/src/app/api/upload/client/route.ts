import { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { GUEST_MAX_IMAGE_BYTES } from "@/lib/guest-post-policy";
import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestPostPolicy } from "@/server/queries/policy.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request,
      body,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        const clientIp = getClientIp(request);
        const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;

        if (user) {
          await enforceRateLimit({
            key: `upload:user:${user.id}:ip:${clientIp}`,
            limit: 20,
            windowMs: 60_000,
          });
          return {
            allowedContentTypes: ALLOWED_CONTENT_TYPES,
            maximumSizeInBytes: 5 * 1024 * 1024,
            addRandomSuffix: false,
            cacheControlMaxAge: 60 * 60 * 24 * 30,
          };
        }

        const guestPostPolicy = await getGuestPostPolicy();
        await enforceRateLimit({
          key: `upload:guest:ip:${clientIp}:fp:${guestFingerprint ?? "none"}:10m`,
          limit: guestPostPolicy.uploadRateLimit10m,
          windowMs: 10 * 60_000,
        });

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: GUEST_MAX_IMAGE_BYTES,
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
        };
      },
      onUploadCompleted: async () => {
        return;
      },
    });

    if (result.type === "blob.generate-client-token") {
      return jsonOk({ clientToken: result.clientToken });
    }

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/upload/client", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "이미지 업로드 준비 중 오류가 발생했습니다.",
    });
  }
}
