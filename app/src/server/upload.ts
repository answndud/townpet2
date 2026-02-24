import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

import { runtimeEnv } from "@/lib/env";
import { ServiceError } from "@/server/services/service-error";

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

type SaveUploadedImageOptions = {
  maxSizeBytes?: number;
};

function stripJpegExif(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const chunks: Buffer[] = [buffer.subarray(0, 2)];
  let index = 2;

  while (index < buffer.length) {
    if (buffer[index] !== 0xff || index + 1 >= buffer.length) {
      chunks.push(buffer.subarray(index));
      break;
    }

    const marker = buffer[index + 1];
    if (marker === 0xda) {
      chunks.push(buffer.subarray(index));
      break;
    }

    if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(buffer.subarray(index, index + 2));
      index += 2;
      continue;
    }

    if (index + 3 >= buffer.length) {
      chunks.push(buffer.subarray(index));
      break;
    }

    const segmentLength = buffer.readUInt16BE(index + 2);
    const endIndex = index + 2 + segmentLength;
    if (endIndex > buffer.length) {
      chunks.push(buffer.subarray(index));
      break;
    }

    // APP1(0xE1) segment usually contains EXIF metadata.
    if (marker !== 0xe1) {
      chunks.push(buffer.subarray(index, endIndex));
    }
    index = endIndex;
  }

  return Buffer.concat(chunks);
}

function getFileExtension(mimeType: string) {
  const extension = ALLOWED_MIME_TYPES.get(mimeType);
  if (!extension) {
    throw new ServiceError("지원하지 않는 이미지 형식입니다.", "UNSUPPORTED_IMAGE_TYPE", 400);
  }
  return extension;
}

export async function saveUploadedImage(file: File, options?: SaveUploadedImageOptions) {
  const extension = getFileExtension(file.type);
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

  const outputBuffer =
    file.type === "image/jpeg" ? stripJpegExif(rawBuffer) : rawBuffer;

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const isHostedRuntime = runtimeEnv.isProduction || process.env.VERCEL === "1";

  if (runtimeEnv.blobReadWriteToken) {
    const blob = await put(`uploads/${filename}`, outputBuffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      token: runtimeEnv.blobReadWriteToken,
    });

    return {
      url: blob.url,
      size: outputBuffer.byteLength,
      mimeType: file.type,
    };
  }

  if (isHostedRuntime) {
    throw new ServiceError(
      "이미지 스토리지가 설정되지 않았습니다. 관리자에게 문의해 주세요.",
      "UPLOAD_STORAGE_NOT_CONFIGURED",
      500,
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const absolutePath = path.join(uploadsDir, filename);
  await writeFile(absolutePath, outputBuffer);

  return {
    url: `/uploads/${filename}`,
    size: outputBuffer.byteLength,
    mimeType: file.type,
  };
}
