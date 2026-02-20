"use client";

import { PostType } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";

import { postTypeMeta } from "@/lib/post-presenter";
import { updateNewUserSafetyPolicyAction } from "@/server/actions/policy";

type NewUserSafetyPolicyFormProps = {
  initialPolicy: {
    minAccountAgeHours: number;
    restrictedPostTypes: PostType[];
    contactBlockWindowHours: number;
  };
};

export function NewUserSafetyPolicyForm({
  initialPolicy,
}: NewUserSafetyPolicyFormProps) {
  const [minAccountAgeHours, setMinAccountAgeHours] = useState(
    initialPolicy.minAccountAgeHours,
  );
  const [contactBlockWindowHours, setContactBlockWindowHours] = useState(
    initialPolicy.contactBlockWindowHours,
  );
  const [restrictedPostTypes, setRestrictedPostTypes] = useState<PostType[]>(
    initialPolicy.restrictedPostTypes,
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedTypes = useMemo(() => Object.values(PostType), []);

  const toggleType = (postType: PostType) => {
    setRestrictedPostTypes((prev) => {
      if (prev.includes(postType)) {
        return prev.filter((item) => item !== postType);
      }
      return [...prev, postType];
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const result = await updateNewUserSafetyPolicyAction({
        minAccountAgeHours,
        restrictedPostTypes,
        contactBlockWindowHours,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("신규 계정 안전 정책이 저장되었습니다.");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">고위험 카테고리 작성 제한 시간</span>
          <input
            type="number"
            min={0}
            max={24 * 30}
            value={minAccountAgeHours}
            onChange={(event) => setMinAccountAgeHours(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">연락처 포함 글/댓글 차단 시간</span>
          <input
            type="number"
            min={0}
            max={24 * 30}
            value={contactBlockWindowHours}
            onChange={(event) => setContactBlockWindowHours(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[#355988]">
          작성 제한 대상 카테고리
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTypes.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 border px-3 py-2 text-xs transition ${
                restrictedPostTypes.includes(type)
                  ? "border-[#3567b5] bg-[#eff5ff] text-[#12386c]"
                  : "border-[#c6d6ee] bg-white text-[#355988] hover:bg-[#f6f9ff]"
              }`}
            >
              <input
                type="checkbox"
                className="accent-[#3567b5]"
                checked={restrictedPostTypes.includes(type)}
                onChange={() => toggleType(type)}
                disabled={isPending}
              />
              <span className="font-semibold">{postTypeMeta[type].label}</span>
              <span className="text-[10px] text-[#6a82a7]">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "정책 저장"}
        </button>
      </div>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
