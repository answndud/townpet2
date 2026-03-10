import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { isTrustedUploadPathname } from "@/lib/upload-url";
import { monitorUnhandledError } from "@/server/error-monitor";
import { findStoredUploadSourceByPathname } from "@/server/upload-asset.service";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ path: string[] }>;
};

function inferContentTypeFromStorageKey(storageKey: string) {
  const extension = storageKey.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "gif") {
    return "image/gif";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "avif") {
    return "image/avif";
  }
  if (extension === "heic") {
    return "image/heic";
  }
  if (extension === "heif") {
    return "image/heif";
  }

  return "application/octet-stream";
}

function buildMediaHeaders(params: {
  contentType?: string | null;
  contentLength?: string | null;
}) {
  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "same-site",
  });

  if (params.contentType) {
    headers.set("Content-Type", params.contentType);
  }
  if (params.contentLength) {
    headers.set("Content-Length", params.contentLength);
  }

  return headers;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path: requestedSegments } = await params;
  const storageKey = requestedSegments.join("/");

  if (!isTrustedUploadPathname(storageKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MEDIA_NOT_FOUND",
          message: "이미지를 찾을 수 없습니다.",
        },
      },
      { status: 404 },
    );
  }

  try {
    const storedSource = await findStoredUploadSourceByPathname(storageKey);

    if (!storedSource || storedSource.storageProvider === "LOCAL") {
      const absolutePath = path.join(process.cwd(), "public", ...storageKey.split("/"));
      try {
        const buffer = await readFile(absolutePath);
        return new Response(buffer, {
          status: 200,
          headers: buildMediaHeaders({
            contentType: inferContentTypeFromStorageKey(storageKey),
            contentLength: String(buffer.byteLength),
          }),
        });
      } catch (error) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof (error as { code?: unknown }).code === "string"
            ? (error as { code: string }).code
            : null;
        if (code === "ENOENT") {
          return NextResponse.json(
            {
              ok: false,
              error: {
                code: "MEDIA_NOT_FOUND",
                message: "이미지를 찾을 수 없습니다.",
              },
            },
            { status: 404 },
          );
        }
        throw error;
      }
    }

    const upstream = await fetch(storedSource.sourceUrl, {
      method: "GET",
      cache: "force-cache",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MEDIA_NOT_FOUND",
            message: "이미지를 찾을 수 없습니다.",
          },
        },
        { status: 404 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: buildMediaHeaders({
        contentType: upstream.headers.get("content-type"),
        contentLength: upstream.headers.get("content-length"),
      }),
    });
  } catch (error) {
    await monitorUnhandledError(error, {
      route: "GET /media/[...path]",
      request,
      extra: { storageKey },
    });

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "이미지를 불러오는 중 오류가 발생했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
