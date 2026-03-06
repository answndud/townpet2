"use client";

import { ReportStatus, ReportTarget } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";

import { ReportActions } from "@/components/admin/report-actions";
import { getReportTargetLabel } from "@/lib/report-target";

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
    <section className="tp-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dde7f5] bg-[#f6f9ff] px-4 py-2.5 text-[11px] sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-[#cbdcf5] bg-white px-3 py-1 text-[#315b9a]">
            선택 {selectedIds.length}건
          </span>
          <input
            className="tp-input-soft h-8 bg-white px-3 text-xs"
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
            className="tp-btn-primary h-8 px-3 disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={isPending || selectedIds.length === 0}
          >
            일괄 승인
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("DISMISS")}
            className="rounded-lg border border-rose-300 bg-white h-8 px-3 text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            일괄 기각
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("HIDE_POST")}
            className="tp-btn-soft h-8 px-3 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            게시글 숨김
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("UNHIDE_POST")}
            className="tp-btn-soft h-8 px-3 disabled:cursor-not-allowed disabled:opacity-60"
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
          <table className="w-full min-w-[1080px] text-left text-[13px]">
            <thead className="bg-[#f6f9ff] text-[11px] uppercase tracking-[0.14em] text-[#5b78a1]">
              <tr>
                <th className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th className="px-3 py-2.5">대상</th>
                <th className="px-3 py-2.5">타입</th>
                <th className="px-3 py-2.5">상태</th>
                <th className="px-3 py-2.5">사유</th>
                <th className="px-3 py-2.5">설명</th>
                <th className="px-3 py-2.5">신고자</th>
                <th className="px-3 py-2.5">처리</th>
                <th className="px-3 py-2.5">처리 메모</th>
                <th className="px-3 py-2.5">처리자</th>
                <th className="px-3 py-2.5">처리 시간</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <Fragment key={report.id}>
                  <tr className="border-t border-[#e1e9f5] text-[#1f3f71]">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(report.id)}
                        onChange={() => toggleSelection(report.id)}
                        aria-label={`신고 ${report.id} 선택`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
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
                    <td className="px-3 py-2.5 text-xs text-[#4f678d]">
                      {getReportTargetLabel(report.targetType)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
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
                    <td className="px-3 py-2.5 text-xs text-[#4f678d]">{report.reason}</td>
                    <td className="px-3 py-2.5 text-xs text-[#4f678d]">
                      {report.description ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#4f678d]">
                      {report.reporterLabel}
                    </td>
                    <td className="px-3 py-2.5">
                      <ReportActions reportId={report.id} status={report.status} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#4f678d]">
                      {report.resolution ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#4f678d]">
                      {report.resolvedByLabel ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#4f678d]">
                      {report.resolvedAtLabel ?? "-"}
                    </td>
                  </tr>
                  <tr className="border-t border-[#e1e9f5] bg-[#f8fbff]">
                    <td colSpan={11} className="px-3 py-2.5 text-xs text-[#4f678d]">
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
                                 <span className="rounded-md border border-[#cbdcf5] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
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
