"use client";

import { PostScope } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "@/components/ui/image-upload-field";
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
};

export function PostDetailEditForm({
  postId,
  title,
  content,
  scope,
  neighborhoodId,
  imageUrls,
  neighborhoods,
}: PostDetailEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    title,
    content,
    scope,
    neighborhoodId: neighborhoodId ?? "",
    imageUrls,
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
      const result = await updatePostAction(postId, {
        title: formState.title,
        content: formState.content,
        scope: formState.scope,
        imageUrls: formState.imageUrls,
        neighborhoodId: showNeighborhood ? formState.neighborhoodId : null,
      });

      if (!result.ok) {
        setError(result.message);
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
        />
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
