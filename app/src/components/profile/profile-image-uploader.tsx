"use client";

import { useState, useTransition } from "react";

import { ImageUploadField } from "@/components/ui/image-upload-field";
import { updateProfileImageAction } from "@/server/actions/user";

type ProfileImageUploaderProps = {
  initialImageUrl?: string | null;
};

export function ProfileImageUploader({ initialImageUrl }: ProfileImageUploaderProps) {
  const [isPending, startTransition] = useTransition();
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialImageUrl ? [initialImageUrl] : [],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveProfileImage = () => {
    setError(null);
    setMessage(null);

    if (!imageUrls[0]) {
      setError("먼저 이미지를 업로드해 주세요.");
      return;
    }

    startTransition(async () => {
      const result = await updateProfileImageAction({ imageUrl: imageUrls[0] });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("프로필 이미지가 저장되었습니다.");
    });
  };

  return (
    <div className="border border-[#c8d7ef] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#153a6a]">프로필 사진</h3>
      <p className="mt-1 text-xs text-[#5a7398]">
        업로드 후 저장 버튼을 누르면 프로필 사진이 변경됩니다.
      </p>

      <div className="mt-3">
        <ImageUploadField
          value={imageUrls}
          onChange={(urls) => setImageUrls(urls.slice(0, 1))}
          maxFiles={1}
          label="아바타 이미지"
        />
      </div>

      <button
        type="button"
        onClick={saveProfileImage}
        disabled={isPending}
        className="mt-3 border border-[#3567b5] bg-[#3567b5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
      >
        {isPending ? "저장 중..." : "프로필 사진 저장"}
      </button>

      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
