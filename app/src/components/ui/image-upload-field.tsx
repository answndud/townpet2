"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";

type UploadResponse = {
  ok: boolean;
  data?: {
    url: string;
    size: number;
    mimeType: string;
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
};

type FailedUploadItem = {
  id: string;
  file: File;
  message: string;
};

const GUEST_FP_STORAGE_KEY = "townpet:guest-fingerprint:v1";

function getGuestFingerprint() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(GUEST_FP_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(GUEST_FP_STORAGE_KEY, created);
  return created;
}

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

export function ImageUploadField({
  value,
  onChange,
  label = "이미지",
  maxFiles = 10,
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
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "x-guest-fingerprint": getGuestFingerprint(),
      },
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

    const nextUrls = [...valueRef.current];
    const failedItems: FailedUploadItem[] = [];

    try {
      for (const file of targetFiles) {
        try {
          const url = await uploadSingleFile(file);
          nextUrls.push(url);
        } catch (uploadError) {
          failedItems.push({
            id: buildUploadId(),
            file,
            message: formatUploadError(uploadError),
          });
        }
      }

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
      const nextFailed: FailedUploadItem[] = [];
      let availableSlots = Math.max(0, maxFiles - nextUrls.length);

      for (const target of retryTargets) {
        if (availableSlots <= 0) {
          nextFailed.push(target);
          continue;
        }

        try {
          const url = await uploadSingleFile(target.file);
          nextUrls.push(url);
          availableSlots -= 1;
        } catch (uploadError) {
          nextFailed.push({
            ...target,
            message: formatUploadError(uploadError),
          });
        }
      }

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

      <div className="border border-dashed border-[#bfd0ec] bg-[#f8fbff] p-3">
        <input
          data-testid="image-upload-input"
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={handleFileChange}
          disabled={isBusy || remainCount <= 0}
          className="w-full text-xs text-[#355988] file:mr-3 file:border file:border-[#3567b5] file:bg-[#3567b5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:transition hover:file:bg-[#2f5da4]"
        />
        <p className="mt-2 text-xs text-[#5d789f]">
          JPG/PNG/WEBP/GIF, 파일당 최대 5MB
        </p>
        {isUploading ? (
          <p className="mt-2 text-xs font-medium text-[#3567b5]">업로드 중...</p>
        ) : null}
        {isRetryingAll ? (
          <p className="mt-2 text-xs font-medium text-[#3567b5]">실패 파일 재업로드 중...</p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </div>

      {failedUploads.length > 0 ? (
        <div className="border border-amber-300 bg-amber-50 p-3">
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
              className="border border-amber-500 bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
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
                  className="border border-amber-200 bg-white p-2"
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
                      className="border border-[#3567b5] bg-[#3567b5] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRetrying ? "재시도 중..." : "재시도"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFailedUpload(item.id)}
                      disabled={isBusy}
                      className="border border-[#c1ccd9] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#425874] transition hover:bg-[#f4f7fb] disabled:cursor-not-allowed disabled:opacity-70"
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
              className="relative border border-[#dbe6f6] bg-white p-1"
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
                className="absolute right-1 top-1 border border-rose-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50"
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
