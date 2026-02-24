"use client";

import { PostScope } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "@/components/ui/image-upload-field";
import { GUEST_MAX_IMAGE_COUNT } from "@/lib/guest-post-policy";
import { updatePostAction } from "@/server/actions/post";

type NeighborhoodOption = {
  id: string;
  name: string;
  city: string;
  district: string;
};

type PostDetailEditFormProps = {
  postId: string;
  title: string;
  content: string;
  scope: PostScope;
  neighborhoodId: string | null;
  imageUrls: string[];
  neighborhoods: NeighborhoodOption[];
  isAuthenticated: boolean;
  guestPassword?: string;
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

export function PostDetailEditForm({
  postId,
  title,
  content,
  scope,
  neighborhoodId,
  imageUrls,
  neighborhoods,
  isAuthenticated,
  guestPassword = "",
}: PostDetailEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    title,
    content,
    scope: isAuthenticated ? scope : PostScope.GLOBAL,
    neighborhoodId: neighborhoodId ?? "",
    imageUrls,
    guestPassword,
  });

  const neighborhoodOptions = useMemo(
    () =>
      neighborhoods.map((neighborhood) => ({
        value: neighborhood.id,
        label: `${neighborhood.city} ${neighborhood.name}`,
      })),
    [neighborhoods],
  );

  const showNeighborhood = formState.scope === PostScope.LOCAL;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        title: formState.title,
        content: formState.content,
        scope: isAuthenticated ? formState.scope : PostScope.GLOBAL,
        imageUrls: formState.imageUrls,
        neighborhoodId: showNeighborhood ? formState.neighborhoodId : null,
        guestPassword: isAuthenticated ? undefined : formState.guestPassword,
      };

      const result = isAuthenticated
        ? await updatePostAction(postId, payload)
        : await fetch(`/api/posts/${postId}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              "x-guest-fingerprint": getGuestFingerprint(),
              "x-guest-mode": "1",
            },
            body: JSON.stringify(payload),
          })
            .then(async (response) => {
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };

              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }
              return {
                ok: false,
                message: payload.error?.message ?? "비회원 수정에 실패했습니다.",
              } as const;
            })
            .catch(() => ({ ok: false, message: "네트워크 오류가 발생했습니다." } as const));

      if (!result.ok) {
        setError(result.message ?? "수정에 실패했습니다.");
        return;
      }

      router.push(`/posts/${postId}`);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full border border-[#c8d7ef] bg-white p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#153a6a]">게시물 수정</h2>
        <button
          type="submit"
          className="border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "수정 저장"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          제목
          <input
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          범위
          <select
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.scope}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                scope: event.target.value as PostScope,
                neighborhoodId: event.target.value === PostScope.LOCAL
                  ? prev.neighborhoodId
                  : "",
              }))
            }
            disabled={!isAuthenticated}
          >
            <option value={PostScope.LOCAL}>동네</option>
            <option value={PostScope.GLOBAL}>온동네</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          동네
          <select
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.neighborhoodId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                neighborhoodId: event.target.value,
              }))
            }
            disabled={!showNeighborhood}
            required={showNeighborhood}
          >
            <option value="">선택</option>
            {neighborhoodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isAuthenticated ? (
        <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#355988]">
          글 비밀번호
          <input
            type="password"
            className="max-w-[260px] border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={formState.guestPassword}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, guestPassword: event.target.value }))
            }
            minLength={4}
            maxLength={32}
            required
          />
        </label>
      ) : null}

      <label className="mt-6 flex flex-col gap-2 text-sm font-medium text-[#355988]">
        내용
        <textarea
          className="min-h-[220px] border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
          value={formState.content}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, content: event.target.value }))
          }
          required
        />
      </label>

      <div className="mt-6">
        <ImageUploadField
          value={formState.imageUrls}
          onChange={(nextUrls) =>
            setFormState((prev) => ({ ...prev, imageUrls: nextUrls }))
          }
          label="게시글 이미지"
          maxFiles={isAuthenticated ? 10 : GUEST_MAX_IMAGE_COUNT}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
