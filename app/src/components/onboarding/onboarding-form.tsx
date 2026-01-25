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
  primaryNeighborhoodId: string | null;
  neighborhoods: NeighborhoodOption[];
};

export function OnboardingForm({
  email,
  nickname,
  primaryNeighborhoodId,
  neighborhoods,
}: OnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(nickname ?? "");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    primaryNeighborhoodId ?? "",
  );

  const handleProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await updateProfileAction({ nickname: profileName });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage("닉네임이 저장되었습니다.");
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
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
            Profile
          </p>
          <h2 className="text-xl font-semibold">닉네임 설정</h2>
          <p className="text-sm text-[#6f6046]">
            동네 활동에 표시될 닉네임을 설정해 주세요.
          </p>
        </div>
        <form onSubmit={handleProfile} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm font-medium">
            닉네임
            <input
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="예: townpet-user"
              required
            />
          </label>
          <p className="text-xs text-[#9a8462]">로그인 이메일: {email}</p>
          <button
            type="submit"
            className="self-start rounded-full bg-[#2a241c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
            disabled={isPending}
          >
            닉네임 저장
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
            Neighborhood
          </p>
          <h2 className="text-xl font-semibold">대표 동네 선택</h2>
          <p className="text-sm text-[#6f6046]">
            Local 피드를 보기 위해 동네를 선택해 주세요.
          </p>
        </div>
        <form
          onSubmit={handleNeighborhood}
          className="mt-4 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            동네
            <select
              className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
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
            type="submit"
            className="self-start rounded-full bg-[#2a241c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3a3228] disabled:cursor-not-allowed disabled:bg-[#cbbba5]"
            disabled={isPending}
          >
            동네 저장
          </button>
        </form>
      </section>

      {message ? (
        <div className="rounded-2xl border border-[#e3d6c4] bg-[#fdf9f2] px-4 py-3 text-xs text-[#6f6046]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
