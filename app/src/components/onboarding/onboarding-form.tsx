"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  setPrimaryNeighborhoodAction,
  updateProfileAction,
} from "@/server/actions/user";

type NeighborhoodOption = {
  id: string;
  name: string;
  city: string;
  district: string;
};

type OnboardingFormProps = {
  email: string;
  nickname: string | null;
  bio: string | null;
  primaryNeighborhoodId: string | null;
  neighborhoods: NeighborhoodOption[];
};

export function OnboardingForm({
  email,
  nickname,
  bio,
  primaryNeighborhoodId,
  neighborhoods,
}: OnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(nickname ?? "");
  const [profileBio, setProfileBio] = useState(bio ?? "");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    primaryNeighborhoodId ?? "",
  );

  const handleProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await updateProfileAction({
        nickname: profileName,
        bio: profileBio,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage("프로필이 저장되었습니다.");
      router.refresh();
    });
  };

  const handleNeighborhood = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await setPrimaryNeighborhoodAction({
        neighborhoodId: selectedNeighborhood,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage("대표 동네가 저장되었습니다.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            프로필
          </p>
          <h2 className="text-xl font-semibold text-[#153a6a]">닉네임 설정</h2>
          <p className="text-sm text-[#4f678d]">
            동네 활동에 표시될 닉네임을 설정해 주세요.
          </p>
        </div>
        <form onSubmit={handleProfile} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            닉네임
            <input
              data-testid="onboarding-nickname"
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="예: townpet-user"
              required
            />
          </label>
          <p className="text-xs text-[#5a7398]">로그인 이메일: {email}</p>
          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            소개(선택)
            <textarea
              className="min-h-[96px] border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={profileBio}
              onChange={(event) => setProfileBio(event.target.value)}
              placeholder="나와 반려동물을 간단히 소개해 주세요."
              maxLength={240}
            />
            <span className="text-[11px] text-[#5a7398]">{profileBio.length}/240</span>
          </label>
          <button
            data-testid="onboarding-profile-submit"
            type="submit"
            className="self-start border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={isPending}
          >
            닉네임 저장
          </button>
        </form>
      </section>

      <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">
            동네
          </p>
          <h2 className="text-xl font-semibold text-[#153a6a]">대표 동네 선택</h2>
          <p className="text-sm text-[#4f678d]">
            동네 피드를 보기 위해 대표 동네를 선택해 주세요.
          </p>
        </div>
        <form
          onSubmit={handleNeighborhood}
          className="mt-4 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
            동네
            <select
              data-testid="onboarding-neighborhood"
              className="border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={selectedNeighborhood}
              onChange={(event) => setSelectedNeighborhood(event.target.value)}
              required
            >
              <option value="">선택</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.city} {neighborhood.name}
                </option>
              ))}
            </select>
          </label>
          <button
            data-testid="onboarding-neighborhood-submit"
            type="submit"
            className="self-start border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={isPending}
          >
            동네 저장
          </button>
        </form>
      </section>

      {message ? (
        <div className="border border-[#bfd0ec] bg-[#f6f9ff] px-4 py-3 text-xs text-[#4f678d]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
