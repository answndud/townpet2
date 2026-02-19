"use client";

import { useState, useTransition } from "react";

import { updateProfileAction } from "@/server/actions/user";

type ProfileInfoFormProps = {
  initialNickname: string | null;
  initialBio: string | null;
};

export function ProfileInfoForm({
  initialNickname,
  initialBio,
}: ProfileInfoFormProps) {
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      const result = await updateProfileAction({
        nickname,
        bio,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("프로필 정보가 저장되었습니다.");
    });
  };

  return (
    <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#153a6a]">프로필 정보 수정</h2>
      <div className="mt-4 grid gap-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          닉네임
          <input
            className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={20}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          소개
          <textarea
            className="min-h-[100px] border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={240}
            placeholder="나와 반려동물을 간단히 소개해 주세요."
          />
          <span className="text-[11px] text-[#5a7398]">{bio.length}/240</span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "프로필 저장"}
        </button>
        {message ? <span className="text-xs text-[#4f678d]">{message}</span> : null}
      </div>
    </section>
  );
}
