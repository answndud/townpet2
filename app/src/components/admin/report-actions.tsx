"use client";

import { ReportStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ReportActionsProps = {
  reportId: string;
  status: ReportStatus;
  redirectTo?: string;
};

export function ReportActions({ reportId, status, redirectTo }: ReportActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const isLocked = status !== ReportStatus.PENDING;

  const handleUpdate = (status: ReportStatus) => {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolution: resolution.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload?.error?.message ?? "처리에 실패했습니다.");
        return;
      }

      setMessage("처리 완료");
      setResolution("");
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2 text-xs">
      <input
        className="border border-[#bfd0ec] bg-[#f8fbff] px-2 py-1 text-xs text-[#1f3f71]"
        value={resolution}
        onChange={(event) => setResolution(event.target.value)}
        placeholder="처리 메모(선택)"
        disabled={isLocked || isPending}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleUpdate(ReportStatus.RESOLVED)}
          className="border border-[#3567b5] bg-[#3567b5] px-3 py-1 text-white transition hover:bg-[#2f5da4]"
          disabled={isLocked || isPending}
        >
          승인
        </button>
        <button
          type="button"
          onClick={() => handleUpdate(ReportStatus.DISMISSED)}
          className="border border-rose-300 bg-white px-3 py-1 text-rose-700 transition hover:bg-rose-50"
          disabled={isLocked || isPending}
        >
          기각
        </button>
        {message ? <span className="text-[#5a7398]">{message}</span> : null}
        {isLocked && !message ? (
          <span className="text-[#5a7398]">처리 완료</span>
        ) : null}
      </div>
    </div>
  );
}
