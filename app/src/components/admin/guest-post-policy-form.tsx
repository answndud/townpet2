"use client";

import { PostType } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";

import { postTypeMeta } from "@/lib/post-presenter";
import { updateGuestPostPolicyAction } from "@/server/actions/policy";

type GuestPostPolicyFormProps = {
  initialPolicy: {
    blockedPostTypes: PostType[];
    maxImageCount: number;
    allowLinks: boolean;
    allowContact: boolean;
    enforceGlobalScope: boolean;
    postRateLimit10m: number;
    postRateLimit1h: number;
    postRateLimit24h: number;
    uploadRateLimit10m: number;
    banThreshold24h: number;
    banThreshold7dMedium: number;
    banThreshold7dHigh: number;
    banDurationHoursShort: number;
    banDurationHoursMedium: number;
    banDurationHoursLong: number;
  };
};

export function GuestPostPolicyForm({ initialPolicy }: GuestPostPolicyFormProps) {
  const [blockedPostTypes, setBlockedPostTypes] = useState<PostType[]>(
    initialPolicy.blockedPostTypes,
  );
  const [maxImageCount, setMaxImageCount] = useState(initialPolicy.maxImageCount);
  const [allowLinks, setAllowLinks] = useState(initialPolicy.allowLinks);
  const [allowContact, setAllowContact] = useState(initialPolicy.allowContact);
  const [enforceGlobalScope, setEnforceGlobalScope] = useState(initialPolicy.enforceGlobalScope);
  const [postRateLimit10m, setPostRateLimit10m] = useState(initialPolicy.postRateLimit10m);
  const [postRateLimit1h, setPostRateLimit1h] = useState(initialPolicy.postRateLimit1h);
  const [postRateLimit24h, setPostRateLimit24h] = useState(initialPolicy.postRateLimit24h);
  const [uploadRateLimit10m, setUploadRateLimit10m] = useState(initialPolicy.uploadRateLimit10m);
  const [banThreshold24h, setBanThreshold24h] = useState(initialPolicy.banThreshold24h);
  const [banThreshold7dMedium, setBanThreshold7dMedium] = useState(initialPolicy.banThreshold7dMedium);
  const [banThreshold7dHigh, setBanThreshold7dHigh] = useState(initialPolicy.banThreshold7dHigh);
  const [banDurationHoursShort, setBanDurationHoursShort] = useState(initialPolicy.banDurationHoursShort);
  const [banDurationHoursMedium, setBanDurationHoursMedium] = useState(initialPolicy.banDurationHoursMedium);
  const [banDurationHoursLong, setBanDurationHoursLong] = useState(initialPolicy.banDurationHoursLong);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedTypes = useMemo(() => Object.values(PostType), []);

  const toggleType = (value: PostType) => {
    setBlockedPostTypes((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const result = await updateGuestPostPolicyAction({
        blockedPostTypes,
        maxImageCount,
        allowLinks,
        allowContact,
        enforceGlobalScope,
        postRateLimit10m,
        postRateLimit1h,
        postRateLimit24h,
        uploadRateLimit10m,
        banThreshold24h,
        banThreshold7dMedium,
        banThreshold7dHigh,
        banDurationHoursShort,
        banDurationHoursMedium,
        banDurationHoursLong,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("비회원 작성 정책이 저장되었습니다.");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">비회원 이미지 최대 개수</span>
          <input
            data-testid="guest-post-policy-max-image-count"
            type="number"
            min={0}
            max={10}
            value={maxImageCount}
            onChange={(event) => setMaxImageCount(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex items-center gap-2 border border-[#c6d6ee] bg-white px-3 py-2 text-xs text-[#355988]">
          <input
            data-testid="guest-post-policy-enforce-global-scope"
            type="checkbox"
            className="accent-[#3567b5]"
            checked={enforceGlobalScope}
            onChange={(event) => setEnforceGlobalScope(event.target.checked)}
            disabled={isPending}
          />
          <span className="font-semibold">온동네(Global)만 허용</span>
        </label>
        <label className="flex items-center gap-2 border border-[#c6d6ee] bg-white px-3 py-2 text-xs text-[#355988]">
          <input
            data-testid="guest-post-policy-allow-links"
            type="checkbox"
            className="accent-[#3567b5]"
            checked={allowLinks}
            onChange={(event) => setAllowLinks(event.target.checked)}
            disabled={isPending}
          />
          <span className="font-semibold">외부 링크 허용</span>
        </label>
        <label className="flex items-center gap-2 border border-[#c6d6ee] bg-white px-3 py-2 text-xs text-[#355988]">
          <input
            data-testid="guest-post-policy-allow-contact"
            type="checkbox"
            className="accent-[#3567b5]"
            checked={allowContact}
            onChange={(event) => setAllowContact(event.target.checked)}
            disabled={isPending}
          />
          <span className="font-semibold">연락처/메신저 허용</span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">글 제한(10분)</span>
          <input
            data-testid="guest-post-policy-rate-post-10m"
            type="number"
            min={1}
            max={200}
            value={postRateLimit10m}
            onChange={(event) => setPostRateLimit10m(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">글 제한(1시간)</span>
          <input
            data-testid="guest-post-policy-rate-post-1h"
            type="number"
            min={1}
            max={1000}
            value={postRateLimit1h}
            onChange={(event) => setPostRateLimit1h(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">글 제한(24시간)</span>
          <input
            data-testid="guest-post-policy-rate-post-24h"
            type="number"
            min={1}
            max={5000}
            value={postRateLimit24h}
            onChange={(event) => setPostRateLimit24h(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">업로드 제한(10분)</span>
          <input
            data-testid="guest-post-policy-rate-upload-10m"
            type="number"
            min={1}
            max={200}
            value={uploadRateLimit10m}
            onChange={(event) => setUploadRateLimit10m(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">제재 임계치(24시간)</span>
          <input
            data-testid="guest-post-policy-threshold-24h"
            type="number"
            min={1}
            max={100}
            value={banThreshold24h}
            onChange={(event) => setBanThreshold24h(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">제재 임계치(7일 2차)</span>
          <input
            data-testid="guest-post-policy-threshold-7d-medium"
            type="number"
            min={1}
            max={500}
            value={banThreshold7dMedium}
            onChange={(event) => setBanThreshold7dMedium(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">제재 임계치(7일 3차)</span>
          <input
            data-testid="guest-post-policy-threshold-7d-high"
            type="number"
            min={1}
            max={500}
            value={banThreshold7dHigh}
            onChange={(event) => setBanThreshold7dHigh(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">제재 시간(1차)</span>
          <input
            data-testid="guest-post-policy-ban-short"
            type="number"
            min={1}
            max={24 * 365}
            value={banDurationHoursShort}
            onChange={(event) => setBanDurationHoursShort(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">제재 시간(2차)</span>
          <input
            data-testid="guest-post-policy-ban-medium"
            type="number"
            min={1}
            max={24 * 365}
            value={banDurationHoursMedium}
            onChange={(event) => setBanDurationHoursMedium(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">제재 시간(3차)</span>
          <input
            data-testid="guest-post-policy-ban-long"
            type="number"
            min={1}
            max={24 * 365}
            value={banDurationHoursLong}
            onChange={(event) => setBanDurationHoursLong(Number(event.target.value))}
            disabled={isPending}
            className="border border-[#bfd0ec] bg-white px-3 py-2 text-sm text-[#163462]"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[#355988]">비회원 작성 차단 카테고리</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTypes.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 border px-3 py-2 text-xs transition ${
                blockedPostTypes.includes(type)
                  ? "border-[#3567b5] bg-[#eff5ff] text-[#12386c]"
                  : "border-[#c6d6ee] bg-white text-[#355988] hover:bg-[#f6f9ff]"
              }`}
            >
              <input
                type="checkbox"
                className="accent-[#3567b5]"
                data-testid={`guest-post-policy-blocked-type-${type}`}
                checked={blockedPostTypes.includes(type)}
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
          data-testid="guest-post-policy-submit"
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "정책 저장"}
        </button>
      </div>

      {message ? <p data-testid="guest-post-policy-success" className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
