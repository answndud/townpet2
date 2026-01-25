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
    <section className="overflow-hidden rounded-2xl border border-[#e3d6c4] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efe4d4] bg-[#fdf9f2] px-6 py-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#e3d6c4] bg-white px-3 py-1">
            선택 {selectedIds.length}건
          </span>
          <input
            className="rounded-md border border-[#e3d6c4] bg-white px-3 py-1 text-xs"
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
            className="rounded-md border border-[#e3d6c4] px-3 py-1 text-[#2a241c] hover:bg-[#f7ece0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            일괄 승인
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("DISMISS")}
            className="rounded-md border border-[#e3d6c4] px-3 py-1 text-[#6f6046] hover:bg-[#f7ece0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            일괄 기각
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("HIDE_POST")}
            className="rounded-md border border-[#e3d6c4] px-3 py-1 text-[#2a241c] hover:bg-[#f7ece0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            게시글 숨김
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("UNHIDE_POST")}
            className="rounded-md border border-[#e3d6c4] px-3 py-1 text-[#2a241c] hover:bg-[#f7ece0] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || selectedIds.length === 0}
          >
            숨김 해제
          </button>
          {message ? <span className="text-[#9a8462]">{message}</span> : null}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-[#9a8462]">
          선택한 상태의 신고가 없습니다.
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fdf9f2] text-xs uppercase tracking-[0.2em] text-[#9a8462]">
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
                <tr className="border-t border-[#efe4d4]">
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
                          className="font-semibold text-[#2a241c]"
                        >
                          {report.targetTitle}
                        </Link>
                      ) : (
                        <span className="text-[#6f6046]">{report.targetTitle}</span>
                      )}
                      <Link
                        href={`/admin/reports/${report.id}`}
                        className="text-[10px] text-[#9a8462]"
                      >
                        상세 보기
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6f6046]">
                    {targetLabels[report.targetType]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        report.status === ReportStatus.PENDING
                          ? "bg-[#f2c07c] text-[#2a241c]"
                          : report.status === ReportStatus.RESOLVED
                            ? "bg-[#2a241c] text-white"
                            : "bg-[#cbbba5] text-white"
                      }`}
                    >
                      {statusLabels[report.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6f6046]">{report.reason}</td>
                  <td className="px-4 py-3 text-xs text-[#6f6046]">
                    {report.description ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6f6046]">
                    {report.reporterLabel}
                  </td>
                  <td className="px-4 py-3">
                    <ReportActions reportId={report.id} status={report.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6f6046]">
                    {report.resolution ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6f6046]">
                    {report.resolvedByLabel ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6f6046]">
                    {report.resolvedAtLabel ?? "-"}
                  </td>
                </tr>
                <tr className="border-t border-[#efe4d4] bg-[#fdf9f2]">
                  <td colSpan={11} className="px-4 py-3 text-xs text-[#6f6046]">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
                        처리 이력
                      </span>
                      {report.audits.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {report.audits.map((audit) => (
                            <div
                              key={audit.id}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="rounded-full border border-[#e3d6c4] bg-white px-2 py-0.5 text-[10px] text-[#6f6046]">
                                {statusLabels[audit.status]}
                              </span>
                              <span className="text-xs text-[#6f6046]">
                                {audit.resolution ?? "메모 없음"}
                              </span>
                              <span className="text-xs text-[#9a8462]">
                                {audit.resolverLabel}
                              </span>
                              <span className="text-xs text-[#9a8462]">
                                {audit.createdAt ?? "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[#9a8462]">이력 없음</span>
                      )}
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
