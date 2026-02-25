import { NextRequest } from "next/server";
import { PostScope, PostType } from "@prisma/client";

import {
  breedCodeParamSchema,
  breedLoungeGroupBuyCreateSchema,
} from "@/lib/validations/lounge";
import { getCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { createPost } from "@/server/services/post.service";
import { ServiceError } from "@/server/services/service-error";

type RouteContext = {
  params: Promise<{ breedCode?: string }>;
};

function buildGroupBuyTemplateContent(params: {
  breedCode: string;
  productName: string;
  targetPrice?: number;
  minParticipants?: number;
  purchaseDeadline?: string;
  deliveryMethod?: string;
  content: string;
}) {
  const templateLines = [
    "[공동구매 템플릿]",
    `품종코드: ${params.breedCode}`,
    `상품명: ${params.productName}`,
    `목표가격: ${params.targetPrice !== undefined ? `${params.targetPrice.toLocaleString()}원` : "미정"}`,
    `최소참여인원: ${params.minParticipants !== undefined ? `${params.minParticipants}명` : "미정"}`,
    `마감일: ${params.purchaseDeadline ?? "미정"}`,
    `전달방식: ${params.deliveryMethod ?? "미정"}`,
    "",
    "[상세 안내]",
    params.content,
  ];

  return templateLines.join("\n");
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { breedCode: rawBreedCode } = await context.params;
    const parsedBreedCode = breedCodeParamSchema.safeParse(rawBreedCode);
    if (!parsedBreedCode.success) {
      return jsonError(400, {
        code: "INVALID_BREED_CODE",
        message: "품종 코드 형식이 올바르지 않습니다.",
      });
    }

    const body = await request.json();
    const parsed = breedLoungeGroupBuyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "공동구매 작성 입력값이 올바르지 않습니다.",
      });
    }

    const user = await getCurrentUser();
    if (user) {
      await enforceRateLimit({ key: `lounge-groupbuy:${user.id}`, limit: 5, windowMs: 60_000 });
      const post = await createPost({
        authorId: user.id,
        input: {
          title: parsed.data.title,
          content: buildGroupBuyTemplateContent({
            breedCode: parsedBreedCode.data,
            productName: parsed.data.productName,
            targetPrice: parsed.data.targetPrice,
            minParticipants: parsed.data.minParticipants,
            purchaseDeadline: parsed.data.purchaseDeadline,
            deliveryMethod: parsed.data.deliveryMethod,
            content: parsed.data.content,
          }),
          type: PostType.MARKET_LISTING,
          scope: PostScope.GLOBAL,
          animalTags: [parsedBreedCode.data],
          imageUrls: parsed.data.imageUrls ?? [],
        },
      });
      return jsonOk(post, { status: 201 });
    }

    const clientIp = getClientIp(request);
    const guestFingerprint = request.headers.get("x-guest-fingerprint")?.trim() || undefined;
    const guestRateKey = `lounge-groupbuy:guest:ip:${clientIp}:fp:${guestFingerprint ?? "none"}`;
    await enforceRateLimit({ key: `${guestRateKey}:10m`, limit: 3, windowMs: 10 * 60_000 });
    await enforceRateLimit({ key: `${guestRateKey}:1h`, limit: 8, windowMs: 60 * 60_000 });

    const post = await createPost({
      input: {
        title: parsed.data.title,
        content: buildGroupBuyTemplateContent({
          breedCode: parsedBreedCode.data,
          productName: parsed.data.productName,
          targetPrice: parsed.data.targetPrice,
          minParticipants: parsed.data.minParticipants,
          purchaseDeadline: parsed.data.purchaseDeadline,
          deliveryMethod: parsed.data.deliveryMethod,
          content: parsed.data.content,
        }),
        type: PostType.MARKET_LISTING,
        scope: PostScope.GLOBAL,
        animalTags: [parsedBreedCode.data],
        imageUrls: parsed.data.imageUrls ?? [],
        guestDisplayName: parsed.data.guestDisplayName,
        guestPassword: parsed.data.guestPassword,
      },
      guestIdentity: {
        ip: clientIp,
        fingerprint: guestFingerprint,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });

    return jsonOk(post, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "POST /api/lounges/breeds/[breedCode]/groupbuys",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
