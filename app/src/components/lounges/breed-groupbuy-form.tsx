"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BreedGroupBuyFormProps = {
  breedCode: string;
  isAuthenticated: boolean;
};

type GroupBuyResponse =
  | {
      ok: true;
      data: { id: string };
    }
  | {
      ok: false;
      error: { code: string; message: string };
    };

export function BreedGroupBuyForm({ breedCode, isAuthenticated }: BreedGroupBuyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSubmitting) {
          return;
        }

        const formData = new FormData(event.currentTarget);
        const imageUrlsRaw = (formData.get("imageUrls") as string | null)?.trim() ?? "";
        const imageUrls = imageUrlsRaw
          .split("\n")
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        const payload = {
          title: (formData.get("title") as string | null)?.trim() ?? "",
          content: (formData.get("content") as string | null)?.trim() ?? "",
          productName: (formData.get("productName") as string | null)?.trim() ?? "",
          targetPrice:
            ((formData.get("targetPrice") as string | null)?.trim() ?? "").length > 0
              ? Number(formData.get("targetPrice"))
              : undefined,
          minParticipants:
            ((formData.get("minParticipants") as string | null)?.trim() ?? "").length > 0
              ? Number(formData.get("minParticipants"))
              : undefined,
          purchaseDeadline: (formData.get("purchaseDeadline") as string | null)?.trim() || undefined,
          deliveryMethod: (formData.get("deliveryMethod") as string | null)?.trim() || undefined,
          imageUrls,
          guestDisplayName: (formData.get("guestDisplayName") as string | null)?.trim() || undefined,
          guestPassword: (formData.get("guestPassword") as string | null)?.trim() || undefined,
        };

        setIsSubmitting(true);
        setErrorMessage(null);
        try {
          const response = await fetch(`/api/lounges/breeds/${breedCode}/groupbuys`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          const json = (await response.json()) as GroupBuyResponse;
          if (!response.ok || !json.ok) {
            setErrorMessage(json.ok ? "공동구매 글 저장에 실패했습니다." : json.error.message);
            return;
          }
          router.push(`/posts/${json.data.id}`);
        } catch {
          setErrorMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-[#2d4f7f]">
          <span className="font-semibold">제목</span>
          <input
            name="title"
            required
            maxLength={120}
            className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm"
            placeholder="예: 말티즈 전용 저알러지 사료 공동구매"
          />
        </label>
        <label className="space-y-1 text-sm text-[#2d4f7f]">
          <span className="font-semibold">상품명</span>
          <input
            name="productName"
            required
            maxLength={120}
            className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm"
            placeholder="예: 알러지 케어 사료 6kg"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm text-[#2d4f7f]">
          <span className="font-semibold">목표가격(원)</span>
          <input name="targetPrice" type="number" min={0} className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1 text-sm text-[#2d4f7f]">
          <span className="font-semibold">최소참여인원</span>
          <input name="minParticipants" type="number" min={2} className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1 text-sm text-[#2d4f7f]">
          <span className="font-semibold">마감일</span>
          <input
            name="purchaseDeadline"
            maxLength={60}
            className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm"
            placeholder="예: 2026-03-15"
          />
        </label>
      </div>

      <label className="space-y-1 text-sm text-[#2d4f7f]">
        <span className="font-semibold">전달방식</span>
        <input
          name="deliveryMethod"
          maxLength={120}
          className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm"
          placeholder="예: 택배 / 직거래"
        />
      </label>

      <label className="space-y-1 text-sm text-[#2d4f7f]">
        <span className="font-semibold">상세 설명</span>
        <textarea
          name="content"
          required
          rows={6}
          className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm"
          placeholder="수량, 구매 조건, 주의사항을 구체적으로 작성해 주세요."
        />
      </label>

      <label className="space-y-1 text-sm text-[#2d4f7f]">
        <span className="font-semibold">이미지 URL(선택, 줄바꿈 구분)</span>
        <textarea
          name="imageUrls"
          rows={3}
          className="w-full border border-[#bfd0ec] bg-white px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </label>

      {!isAuthenticated ? (
        <div className="grid gap-3 rounded-sm border border-[#d5c08a] bg-[#fff8e8] p-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-[#6c5319]">
            <span className="font-semibold">비회원 닉네임</span>
            <input
              name="guestDisplayName"
              required
              minLength={2}
              maxLength={24}
              className="w-full border border-[#d5c08a] bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm text-[#6c5319]">
            <span className="font-semibold">비회원 비밀번호</span>
            <input
              name="guestPassword"
              type="password"
              required
              minLength={4}
              maxLength={32}
              className="w-full border border-[#d5c08a] bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-9 items-center border border-[#3567b5] bg-[#3567b5] px-3 text-sm font-semibold text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "저장 중..." : `${breedCode} 공동구매 템플릿으로 작성`}
      </button>
    </form>
  );
}
