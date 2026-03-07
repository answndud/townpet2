"use client";

import { ReportReason, ReportTarget } from "@prisma/client";
import { useState, useTransition } from "react";

import { getReportReasonLabel, reportReasonOptions } from "@/lib/report-reason";

type PostReportFormProps = {
  postId: string;
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
      className="tp-card p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#1f3f71]">신고하기</h2>
        <button
          type="submit"
          className="border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-[#d5dfee] disabled:text-[#9fb2cf]"
          disabled={isPending}
        >
          {isPending ? "접수 중..." : "신고"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          사유
          <select
            className="tp-input-soft px-3 py-2 text-sm"
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as ReportReason)
            }
          >
            {reportReasonOptions.map((value) => (
              <option key={value} value={value}>
                {getReportReasonLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988] md:col-span-2">
          상세 설명(선택)
          <textarea
            className="tp-input-soft min-h-[80px] px-3 py-2 text-sm"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="추가 설명이 필요하면 입력하세요."
          />
        </label>
      </div>

      {message ? <p className="mt-3 text-sm text-[#4f678d]">{message}</p> : null}
    </form>
  );
}
