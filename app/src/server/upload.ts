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
const EXIF_STRIP_MIN_BYTES = 1 * 1024 * 1024;

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
            : true;

  if (!isValid) {
    throw new ServiceError("이미지 파일 형식이 올바르지 않습니다.", "IMAGE_SIGNATURE_MISMATCH", 400);
  }
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

  validateImageSignature(file.type, rawBuffer);

  const outputBuffer =
    file.type === "image/jpeg" && rawBuffer.byteLength >= EXIF_STRIP_MIN_BYTES
      ? stripJpegExif(rawBuffer)
      : rawBuffer;

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
