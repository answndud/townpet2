"use client";

import { ReportReason, ReportTarget } from "@prisma/client";
import { useState, useTransition } from "react";

type PostReportFormProps = {
  postId: string;
};

const reasonLabels: Record<ReportReason, string> = {
  SPAM: "스팸",
  HARASSMENT: "괴롭힘",
  INAPPROPRIATE: "부적절",
  FAKE: "허위",
  OTHER: "기타",
};

export function PostReportForm({ postId }: PostReportFormProps) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<ReportReason>(ReportReason.SPAM);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: ReportTarget.POST,
          targetId: postId,
          reason,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload?.error?.message ?? "신고에 실패했습니다.");
        return;
      }

      setDescription("");
      setMessage("신고가 접수되었습니다.");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">신고하기</h2>
        <button
          type="submit"
          className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#e3d6c4] disabled:text-[#cbbba5]"
          disabled={isPending}
        >
          {isPending ? "접수 중..." : "신고"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium">
          사유
          <select
            className="rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as ReportReason)
            }
          >
            {Object.values(ReportReason).map((value) => (
              <option key={value} value={value}>
                {reasonLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
          상세 설명(선택)
          <textarea
            className="min-h-[80px] rounded-lg border border-[#e3d6c4] px-3 py-2 text-sm"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="추가 설명이 필요하면 입력하세요."
          />
        </label>
      </div>

      {message ? <p className="mt-3 text-sm text-[#9a8462]">{message}</p> : null}
    </form>
  );
}
