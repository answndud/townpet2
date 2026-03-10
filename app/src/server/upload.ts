import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";
import sharp from "sharp";

import { runtimeEnv } from "@/lib/env";
import { getUploadProxyPath } from "@/lib/upload-url";
import { registerUploadAsset } from "@/server/upload-asset.service";
import { ServiceError } from "@/server/services/service-error";

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
  ["image/avif", "avif"],
]);

const MAX_UPLOAD_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_PROCESSED_IMAGE_SIDE = 2048;
const MAX_THUMBNAIL_SIDE = 480;
const MAX_SHARP_INPUT_PIXELS = 36_000_000;

type SaveUploadedImageOptions = {
  maxSizeBytes?: number;
  ownerUserId?: string | null;
};

type ProcessedImageAsset = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
};

type ProcessedUploadPayload = {
  main: ProcessedImageAsset;
  thumbnail: ProcessedImageAsset | null;
};

type StoredUploadResult = {
  url: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string | null;
  width?: number;
  height?: number;
};

function getFileExtension(mimeType: string) {
  const extension = ALLOWED_MIME_TYPES.get(mimeType);
  if (!extension) {
    throw new ServiceError("지원하지 않는 이미지 형식입니다.", "UNSUPPORTED_IMAGE_TYPE", 400);
  }
  return extension;
}

function hasJpegSignature(buffer: Buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function hasPngSignature(buffer: Buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function hasGifSignature(buffer: Buffer) {
  return (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  );
}

function hasWebpSignature(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

function hasIsoBmffBrand(
  buffer: Buffer,
  supportedBrands: string[],
) {
  if (buffer.length < 12) {
    return false;
  }

  if (buffer.toString("ascii", 4, 8) !== "ftyp") {
    return false;
  }

  const brands = new Set<string>();
  brands.add(buffer.toString("ascii", 8, 12));

  for (let index = 16; index + 4 <= Math.min(buffer.length, 32); index += 4) {
    brands.add(buffer.toString("ascii", index, index + 4));
  }

  return supportedBrands.some((brand) => brands.has(brand));
}

function validateImageSignature(mimeType: string, buffer: Buffer) {
  const isValid =
    mimeType === "image/jpeg"
      ? hasJpegSignature(buffer)
      : mimeType === "image/png"
        ? hasPngSignature(buffer)
        : mimeType === "image/gif"
          ? hasGifSignature(buffer)
          : mimeType === "image/webp"
            ? hasWebpSignature(buffer)
            : mimeType === "image/avif"
              ? hasIsoBmffBrand(buffer, ["avif", "avis", "mif1"])
              : mimeType === "image/heic" || mimeType === "image/heif"
                ? hasIsoBmffBrand(buffer, [
                    "heic",
                    "heix",
                    "hevc",
                    "hevx",
                    "mif1",
                    "msf1",
                  ])
                : true;

  if (!isValid) {
    throw new ServiceError("이미지 파일 형식이 올바르지 않습니다.", "IMAGE_SIGNATURE_MISMATCH", 400);
  }
}

async function processRasterImage(
  rawBuffer: Buffer,
): Promise<ProcessedUploadPayload> {
  try {
    const main = await sharp(rawBuffer, {
      failOn: "error",
      limitInputPixels: MAX_SHARP_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: MAX_PROCESSED_IMAGE_SIDE,
        height: MAX_PROCESSED_IMAGE_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    const thumbnail = await sharp(rawBuffer, {
      failOn: "error",
      limitInputPixels: MAX_SHARP_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: MAX_THUMBNAIL_SIDE,
        height: MAX_THUMBNAIL_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return {
      main: {
        buffer: main.data,
        mimeType: "image/webp",
        extension: "webp",
        width: main.info.width,
        height: main.info.height,
      },
      thumbnail: {
        buffer: thumbnail.data,
        mimeType: "image/webp",
        extension: "webp",
        width: thumbnail.info.width,
        height: thumbnail.info.height,
      },
    };
  } catch {
    throw new ServiceError(
      "이미지를 처리하지 못했습니다. 다른 형식으로 저장한 뒤 다시 시도해 주세요.",
      "IMAGE_PROCESSING_FAILED",
      400,
    );
  }
}

async function processUploadedImage(file: File, rawBuffer: Buffer) {
  if (file.type === "image/gif") {
    return {
      main: {
        buffer: rawBuffer,
        mimeType: file.type,
        extension: getFileExtension(file.type),
      },
      thumbnail: null,
    } satisfies ProcessedUploadPayload;
  }

  return processRasterImage(rawBuffer);
}

async function registerStoredUploadAsset(params: {
  url: string;
  mimeType: string;
  size: number;
  ownerUserId?: string | null;
  thumbnailUrl?: string | null;
  width?: number;
  height?: number;
}) {
  await registerUploadAsset({
    url: params.url,
    mimeType: params.mimeType,
    size: params.size,
    ownerUserId: params.ownerUserId ?? null,
    thumbnailUrl: params.thumbnailUrl ?? null,
    width: params.width,
    height: params.height,
  });
}

function buildClientFacingUploadResult(result: StoredUploadResult) {
  return {
    ...result,
    url: getUploadProxyPath(result.url) ?? result.url,
    thumbnailUrl: result.thumbnailUrl ? getUploadProxyPath(result.thumbnailUrl) ?? result.thumbnailUrl : null,
  } satisfies StoredUploadResult;
}

async function saveHostedUpload(params: {
  filenameBase: string;
  processed: ProcessedUploadPayload;
  ownerUserId?: string | null;
}) {
  if (!runtimeEnv.blobReadWriteToken) {
    throw new Error("blob token missing");
  }

  const mainFilename = `${params.filenameBase}.${params.processed.main.extension}`;
  const thumbnailFilename = params.processed.thumbnail
    ? `${params.filenameBase}.thumb.${params.processed.thumbnail.extension}`
    : null;

  const [blob, thumbnailBlob] = await Promise.all([
    put(`uploads/${mainFilename}`, params.processed.main.buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: params.processed.main.mimeType,
      token: runtimeEnv.blobReadWriteToken,
    }),
    thumbnailFilename && params.processed.thumbnail
      ? put(`uploads/${thumbnailFilename}`, params.processed.thumbnail.buffer, {
          access: "public",
          addRandomSuffix: false,
          contentType: params.processed.thumbnail.mimeType,
          token: runtimeEnv.blobReadWriteToken,
        })
      : Promise.resolve(null),
  ]);

  try {
    await registerStoredUploadAsset({
      url: blob.url,
      mimeType: params.processed.main.mimeType,
      size: params.processed.main.buffer.byteLength,
      ownerUserId: params.ownerUserId ?? null,
      thumbnailUrl: thumbnailBlob?.url ?? null,
      width: params.processed.main.width,
      height: params.processed.main.height,
    });
  } catch (error) {
    try {
      await del(blob.url, { token: runtimeEnv.blobReadWriteToken });
      if (thumbnailBlob?.url) {
        await del(thumbnailBlob.url, { token: runtimeEnv.blobReadWriteToken });
      }
    } catch {
      // Ignore rollback failure and surface the original registration error.
    }
    throw error;
  }

  return buildClientFacingUploadResult({
    url: blob.url,
    size: params.processed.main.buffer.byteLength,
    mimeType: params.processed.main.mimeType,
    thumbnailUrl: thumbnailBlob?.url ?? null,
    width: params.processed.main.width,
    height: params.processed.main.height,
  } satisfies StoredUploadResult);
}

async function saveLocalUpload(params: {
  filenameBase: string;
  processed: ProcessedUploadPayload;
  ownerUserId?: string | null;
}) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const mainFilename = `${params.filenameBase}.${params.processed.main.extension}`;
  const mainAbsolutePath = path.join(uploadsDir, mainFilename);

  const thumbnailFilename = params.processed.thumbnail
    ? `${params.filenameBase}.thumb.${params.processed.thumbnail.extension}`
    : null;
  const thumbnailAbsolutePath = thumbnailFilename
    ? path.join(uploadsDir, thumbnailFilename)
    : null;

  await writeFile(mainAbsolutePath, params.processed.main.buffer);
  if (thumbnailAbsolutePath && params.processed.thumbnail) {
    await writeFile(thumbnailAbsolutePath, params.processed.thumbnail.buffer);
  }

  const url = `/uploads/${mainFilename}`;
  const thumbnailUrl = thumbnailFilename ? `/uploads/${thumbnailFilename}` : null;

  try {
    await registerStoredUploadAsset({
      url,
      mimeType: params.processed.main.mimeType,
      size: params.processed.main.buffer.byteLength,
      ownerUserId: params.ownerUserId ?? null,
      thumbnailUrl,
      width: params.processed.main.width,
      height: params.processed.main.height,
    });
  } catch (error) {
    try {
      await unlink(mainAbsolutePath);
      if (thumbnailAbsolutePath) {
        await unlink(thumbnailAbsolutePath).catch(() => undefined);
      }
    } catch {
      // Ignore rollback failure and surface the original registration error.
    }
    throw error;
  }

  return buildClientFacingUploadResult({
    url,
    size: params.processed.main.buffer.byteLength,
    mimeType: params.processed.main.mimeType,
    thumbnailUrl,
    width: params.processed.main.width,
    height: params.processed.main.height,
  } satisfies StoredUploadResult);
}

export async function saveUploadedImage(file: File, options?: SaveUploadedImageOptions) {
  getFileExtension(file.type);

  const arrayBuffer = await file.arrayBuffer();
  const rawBuffer = Buffer.from(arrayBuffer);
  const maxSizeBytes = options?.maxSizeBytes ?? MAX_UPLOAD_SIZE_BYTES;

  if (rawBuffer.byteLength === 0) {
    throw new ServiceError("빈 파일은 업로드할 수 없습니다.", "EMPTY_FILE", 400);
  }

  if (rawBuffer.byteLength > maxSizeBytes) {
    throw new ServiceError(
      `이미지 크기는 최대 ${Math.floor(maxSizeBytes / (1024 * 1024))}MB까지 업로드할 수 있습니다.`,
      "IMAGE_TOO_LARGE",
      400,
    );
  }

  validateImageSignature(file.type, rawBuffer);

  const processed = await processUploadedImage(file, rawBuffer);
  const filenameBase = `${Date.now()}-${randomUUID()}`;
  const isHostedRuntime = runtimeEnv.isProduction || process.env.VERCEL === "1";

  if (runtimeEnv.blobReadWriteToken) {
    return saveHostedUpload({
      filenameBase,
      processed,
      ownerUserId: options?.ownerUserId ?? null,
    });
  }

  if (isHostedRuntime) {
    throw new ServiceError(
      "이미지 스토리지가 설정되지 않았습니다. 관리자에게 문의해 주세요.",
      "UPLOAD_STORAGE_NOT_CONFIGURED",
      500,
    );
  }

  return saveLocalUpload({
    filenameBase,
    processed,
    ownerUserId: options?.ownerUserId ?? null,
  });
}
