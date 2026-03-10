"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";

import {
  getGuestWriteHeaders,
  type GuestWriteScope,
} from "@/lib/guest-step-up.client";

type UploadResponse = {
  ok: boolean;
  data?: {
    url: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string | null;
    width?: number;
    height?: number;
  };
  error?: {
    code: string;
    message: string;
  };
};

type ImageUploadFieldProps = {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  maxFiles?: number;
  guestWriteScope?: GuestWriteScope;
};

type FailedUploadItem = {
  id: string;
  file: File;
  message: string;
};

const MAX_CLIENT_IMAGE_SIDE = 1920;
const MAX_CLIENT_PREPROCESS_BYTES = 4 * 1024 * 1024;
const MAX_PARALLEL_UPLOADS = 3;
const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
];

function formatUploadError(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "이미지 업로드 중 오류가 발생했습니다.";
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0B";
  }
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)}KB`;
  }
  return `${(kb / 1024).toFixed(1)}MB`;
}

function normalizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function compressImageForUpload(file: File) {
  if (typeof window === "undefined") {
    return file;
  }
  if (
    file.type === "image/gif" ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/avif" ||
    file.size <= MAX_CLIENT_PREPROCESS_BYTES
  ) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지 디코딩에 실패했습니다."));
      img.src = objectUrl;
    });

    const maxSide = Math.max(image.width, image.height);
    const scale = maxSide > MAX_CLIENT_IMAGE_SIDE ? MAX_CLIENT_IMAGE_SIDE / maxSide : 1;
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    const preferredOutputType = file.type === "image/png" ? "image/png" : "image/webp";
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        preferredOutputType,
        preferredOutputType === "image/webp" ? 0.9 : undefined,
      );
    });

    const fallbackBlob = !blob
      ? await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.9);
        })
      : null;

    const outputBlob = blob ?? fallbackBlob;

    if (!outputBlob) {
      throw new Error("이미지 변환에 실패했습니다.");
    }

    const shouldKeepConverted =
      targetWidth !== image.width ||
      targetHeight !== image.height ||
      outputBlob.size < file.size;

    if (!shouldKeepConverted) {
      return file;
    }

    const baseName = normalizeFileName(file.name.replace(/\.[^.]+$/, ""));
    const outputExtension =
      outputBlob.type === "image/png"
        ? "png"
        : outputBlob.type === "image/jpeg"
          ? "jpg"
          : "webp";
    return new File([outputBlob], `${baseName || "image"}.${outputExtension}`, {
      type: outputBlob.type,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
) {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }).map(async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= tasks.length) {
        return;
      }
      results[index] = await tasks[index]!();
    }
  });

  await Promise.all(workers);
  return results;
}

export function ImageUploadField({
  value,
  onChange,
  label = "이미지",
  maxFiles = 10,
  guestWriteScope,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [retryingIds, setRetryingIds] = useState<string[]>([]);
  const [failedUploads, setFailedUploads] = useState<FailedUploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadIdRef = useRef(0);
  const valueRef = useRef<string[]>(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const remainCount = useMemo(
    () => Math.max(0, maxFiles - value.length),
    [maxFiles, value.length],
  );
  const isBusy = isUploading || isRetryingAll || retryingIds.length > 0;

  const buildUploadId = () => {
    uploadIdRef.current += 1;
    return `upload-${Date.now()}-${uploadIdRef.current}`;
  };

  const uploadSingleFile = async (file: File) => {
    const guestHeaders = guestWriteScope
      ? await getGuestWriteHeaders(guestWriteScope)
      : undefined;

    const preparedFile = await compressImageForUpload(file);
    const formData = new FormData();
    formData.append("file", preparedFile);

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: guestHeaders,
      body: formData,
    });

    const payload = (await response.json()) as UploadResponse;
    if (!response.ok || !payload.ok || !payload.data?.url) {
      throw new Error(payload.error?.message ?? "이미지 업로드에 실패했습니다.");
    }

    return payload.data.url;
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    if (remainCount <= 0) {
      setError(`이미지는 최대 ${maxFiles}장까지 첨부할 수 있습니다.`);
      return;
    }

    const targetFiles = files.slice(0, remainCount);
    if (targetFiles.length < files.length) {
      setError(`이미지는 최대 ${maxFiles}장까지 첨부할 수 있어 일부 파일은 제외되었습니다.`);
    } else {
      setError(null);
    }

    setIsUploading(true);

    const uploadResults = await runWithConcurrency(
      targetFiles.map((file) => async () => {
        try {
          const url = await uploadSingleFile(file);
          return { ok: true as const, file, url };
        } catch (uploadError) {
          return {
            ok: false as const,
            file,
            message: formatUploadError(uploadError),
          };
        }
      }),
      MAX_PARALLEL_UPLOADS,
    );

    try {
      const succeededUrls = uploadResults
        .filter((result): result is { ok: true; file: File; url: string } => result.ok)
        .map((result) => result.url);
      const failedItems = uploadResults
        .filter((result): result is { ok: false; file: File; message: string } => !result.ok)
        .map((result) => ({
          id: buildUploadId(),
          file: result.file,
          message: result.message,
        }));

      const nextUrls = [...valueRef.current, ...succeededUrls];

      if (nextUrls.length !== valueRef.current.length) {
        onChange(nextUrls);
      }

      if (failedItems.length > 0) {
        setFailedUploads((prev) => [...failedItems, ...prev].slice(0, 20));
        setError(
          `${failedItems.length}개 파일 업로드에 실패했습니다. 아래에서 개별 재시도를 진행해 주세요.`,
        );
      }
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const next = value.filter((_, currentIndex) => currentIndex !== index);
    onChange(next);
  };

  const retryUpload = async (failedId: string) => {
    const target = failedUploads.find((item) => item.id === failedId);
    if (!target) {
      return;
    }
    if (remainCount <= 0) {
      setError(`이미지는 최대 ${maxFiles}장까지 첨부할 수 있습니다.`);
      return;
    }

    setError(null);
    setRetryingIds((prev) => [...prev, failedId]);
    try {
      const url = await uploadSingleFile(target.file);
      onChange([...value, url]);
      setFailedUploads((prev) => prev.filter((item) => item.id !== failedId));
    } catch (uploadError) {
      const message = formatUploadError(uploadError);
      setFailedUploads((prev) =>
        prev.map((item) =>
          item.id === failedId
            ? {
                ...item,
                message,
              }
            : item,
        ),
      );
      setError("재시도에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRetryingIds((prev) => prev.filter((id) => id !== failedId));
    }
  };

  const retryAllFailedUploads = async () => {
    if (failedUploads.length === 0) {
      return;
    }
    if (remainCount <= 0) {
      setError(`이미지는 최대 ${maxFiles}장까지 첨부할 수 있습니다.`);
      return;
    }

    setError(null);
    setIsRetryingAll(true);

    try {
      const nextUrls = [...valueRef.current];
      const retryTargets = [...failedUploads];
      let availableSlots = Math.max(0, maxFiles - nextUrls.length);
      const executableTargets = retryTargets.slice(0, availableSlots);
      const skippedTargets = retryTargets.slice(availableSlots);

      const retryResults = await runWithConcurrency(
        executableTargets.map((target) => async () => {
          try {
            const url = await uploadSingleFile(target.file);
            return { ok: true as const, target, url };
          } catch (uploadError) {
            return {
              ok: false as const,
              target,
              message: formatUploadError(uploadError),
            };
          }
        }),
        MAX_PARALLEL_UPLOADS,
      );

      for (const result of retryResults) {
        if (result.ok) {
          nextUrls.push(result.url);
          availableSlots -= 1;
        }
      }

      const retryFailed = retryResults
        .filter((result): result is { ok: false; target: FailedUploadItem; message: string } => !result.ok)
        .map((result) => ({
          ...result.target,
          message: result.message,
        }));

      const nextFailed: FailedUploadItem[] = [...retryFailed, ...skippedTargets];

      if (nextUrls.length !== valueRef.current.length) {
        onChange(nextUrls);
      }
      setFailedUploads(nextFailed);

      if (nextFailed.length > 0) {
        setError(
          `${nextFailed.length}개 파일은 재시도 후에도 업로드되지 않았습니다. 네트워크 상태를 확인해 주세요.`,
        );
      }
    } finally {
      setIsRetryingAll(false);
    }
  };

  const removeFailedUpload = (failedId: string) => {
    setFailedUploads((prev) => prev.filter((item) => item.id !== failedId));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#355988]">{label}</p>
        <span className="text-xs text-[#5d789f]">
          {value.length}/{maxFiles}
        </span>
      </div>

      <div className="rounded-lg border border-dashed border-[#cbdcf5] bg-[#f8fbff] p-3">
        <input
          data-testid="image-upload-input"
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_MIME_TYPES.join(",")}
          multiple
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={handleFileChange}
          disabled={isBusy}
          className="w-full text-xs text-[#355988] file:mr-3 file:rounded-md file:border file:border-[#3567b5] file:bg-[#3567b5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:transition hover:file:bg-[#2f5da4]"
        />
        <p className="mt-2 text-xs text-[#5d789f]">
          JPG/PNG/WEBP/GIF/HEIC/AVIF, 파일당 최대 12MB(비회원 5MB). 업로드 후 서버에서 회전/최적화됩니다.
        </p>
        {remainCount <= 0 ? (
          <p className="mt-1 text-xs text-[#5d789f]">현재 첨부 한도에 도달했습니다. 기존 이미지를 삭제한 뒤 다시 선택해 주세요.</p>
        ) : null}
        {isUploading ? (
          <p className="mt-2 text-xs font-medium text-[#3567b5]">업로드 중...</p>
        ) : null}
        {isRetryingAll ? (
          <p className="mt-2 text-xs font-medium text-[#3567b5]">실패 파일 재업로드 중...</p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </div>

      {failedUploads.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-900">
              업로드 실패 파일 {failedUploads.length}개
            </p>
            <button
              type="button"
              onClick={() => {
                void retryAllFailedUploads();
              }}
              disabled={isBusy || remainCount <= 0}
              className="rounded-md border border-amber-500 bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              전체 재시도
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {failedUploads.map((item) => {
              const isRetrying = retryingIds.includes(item.id);
              return (
                <li
                  key={item.id}
                  className="rounded-md border border-amber-200 bg-white p-2"
                >
                  <p className="text-xs font-medium text-amber-900">
                    {item.file.name} ({formatFileSize(item.file.size)})
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-800">{item.message}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void retryUpload(item.id);
                      }}
                      disabled={isBusy || remainCount <= 0}
                      className="tp-btn-primary px-2.5 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRetrying ? "재시도 중..." : "재시도"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFailedUpload(item.id)}
                      disabled={isBusy}
                      className="tp-btn-soft px-2.5 py-1 text-[11px] font-semibold text-[#425874] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      제거
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="image-upload-preview-list">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              data-testid="image-upload-preview-item"
              className="relative rounded-md border border-[#dbe6f6] bg-white p-1"
            >
              <Image
                src={url}
                alt={`첨부 이미지 ${index + 1}`}
                width={480}
                height={280}
                className="h-24 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={isBusy}
                className="absolute right-1 top-1 rounded-sm border border-rose-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
