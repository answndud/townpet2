"use client";

import { ReportStatus, ReportTarget } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";

import { ReportActions } from "@/components/admin/report-actions";

type ReportQueueAudit = {
  id: string;
  status: ReportStatus;
  resolution: string | null;
  resolverLabel: string;
  createdAt: string | null;
};

type ReportQueueItem = {
  id: string;
  targetType: ReportTarget;
  targetTitle: string;
  targetHref?: string;
  status: ReportStatus;
  reason: string;
  description: string | null;
  reporterLabel: string;
  resolution: string | null;
  resolvedByLabel: string | null;
  resolvedAtLabel: string | null;
  audits: ReportQueueAudit[];
};

type ReportQueueTableProps = {
  reports: ReportQueueItem[];
};

const statusLabels: Record<ReportStatus, string> = {
  PENDING: "대기",
  RESOLVED: "승인",
  DISMISSED: "기각",
};

const targetLabels: Record<ReportTarget, string> = {
  POST: "게시글",
  COMMENT: "댓글",
  USER: "사용자",
};

export function ReportQueueTable({ reports }: ReportQueueTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkResolution, setBulkResolution] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const allSelected = useMemo(
    () => reports.length > 0 && selectedIds.length === reports.length,
    [reports.length, selectedIds.length],
  );

  const toggleSelection = (reportId: string) => {
    setSelectedIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : reports.map((report) => report.id));
  };

  const runBulkAction = (action: "RESOLVE" | "DISMISS" | "HIDE_POST" | "UNHIDE_POST") => {
    if (selectedIds.length === 0) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/reports/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportIds: selectedIds,
          action,
          resolution: bulkResolution.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload?.error?.message ?? "일괄 처리에 실패했습니다.");
        return;
      }

      setMessage("일괄 처리 완료");
      setBulkResolution("");
      setSelectedIds([]);
      router.refresh();
    });
  };

  return (
    <section className="overflow-hidden border border-[#c8d7ef] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dde7f5] bg-[#f6f9ff] px-4 py-3 text-xs sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-[#bfd0ec] bg-white px-3 py-1 text-[#315484]">
            선택 {selectedIds.length}건
          </span>
          <input
            className="border border-[#bfd0ec] bg-white px-3 py-1 text-xs text-[#1f3f71]"
            placeholder="일괄 처리 메모(선택)"
            value={bulkResolution}
            onChange={(event) => setBulkResolution(event.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runBulkAction("RESOLVE")}
            className="border border-[#3567b5] bg-[#3567b5] px-3 py-1 text-white transition hover:bg-[#2f5da4] disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={isPending || selectedIds.length === 0}
          >
            일괄 승인
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("DISMISS")}
            className="border border-rose-300 bg-white px-3 py-1 text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            일괄 기각
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("HIDE_POST")}
            className="border border-[#bfd0ec] bg-white px-3 py-1 text-[#315484] transition hover:bg-[#f3f7ff] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            게시글 숨김
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("UNHIDE_POST")}
            className="border border-[#bfd0ec] bg-white px-3 py-1 text-[#315484] transition hover:bg-[#f3f7ff] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            숨김 해제
          </button>
          {message ? <span className="text-[#5a7398]">{message}</span> : null}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-[#5a7398]">
          선택한 상태의 신고가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-[#f6f9ff] text-xs uppercase tracking-[0.2em] text-[#5b78a1]">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th className="px-4 py-3">대상</th>
                <th className="px-4 py-3">타입</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">사유</th>
                <th className="px-4 py-3">설명</th>
                <th className="px-4 py-3">신고자</th>
                <th className="px-4 py-3">처리</th>
                <th className="px-4 py-3">처리 메모</th>
                <th className="px-4 py-3">처리자</th>
                <th className="px-4 py-3">처리 시간</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <Fragment key={report.id}>
                  <tr className="border-t border-[#e1e9f5] text-[#1f3f71]">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(report.id)}
                        onChange={() => toggleSelection(report.id)}
                        aria-label={`신고 ${report.id} 선택`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {report.targetHref ? (
                          <Link
                            href={report.targetHref}
                            className="font-semibold text-[#163462] hover:text-[#2f5da4]"
                          >
                            {report.targetTitle}
                          </Link>
                        ) : (
                          <span className="text-[#4f678d]">{report.targetTitle}</span>
                        )}
                        <Link
                          href={`/admin/reports/${report.id}`}
                          className="text-[10px] text-[#5a7398]"
                        >
                          상세 보기
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4f678d]">
                      {targetLabels[report.targetType]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`border px-2 py-0.5 text-[10px] font-semibold ${
                          report.status === ReportStatus.PENDING
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : report.status === ReportStatus.RESOLVED
                              ? "border-[#3567b5] bg-[#3567b5] text-white"
                              : "border-rose-300 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {statusLabels[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4f678d]">{report.reason}</td>
                    <td className="px-4 py-3 text-xs text-[#4f678d]">
                      {report.description ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4f678d]">
                      {report.reporterLabel}
                    </td>
                    <td className="px-4 py-3">
                      <ReportActions reportId={report.id} status={report.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4f678d]">
                      {report.resolution ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4f678d]">
                      {report.resolvedByLabel ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4f678d]">
                      {report.resolvedAtLabel ?? "-"}
                    </td>
                  </tr>
                  <tr className="border-t border-[#e1e9f5] bg-[#f8fbff]">
                    <td colSpan={11} className="px-4 py-3 text-xs text-[#4f678d]">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#5b78a1]">
                          처리 이력
                        </span>
                        {report.audits.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {report.audits.map((audit) => (
                              <div
                                key={audit.id}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <span className="border border-[#bfd0ec] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                                  {statusLabels[audit.status]}
                                </span>
                                <span className="text-xs text-[#355988]">
                                  {audit.resolution ?? "메모 없음"}
                                </span>
                                <span className="text-xs text-[#5a7398]">
                                  {audit.resolverLabel}
                                </span>
                                <span className="text-xs text-[#5a7398]">
                                  {audit.createdAt ?? "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#5a7398]">이력 없음</span>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
