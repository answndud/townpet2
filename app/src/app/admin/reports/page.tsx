import Link from "next/link";
import { ReportStatus, ReportTarget } from "@prisma/client";
import { Fragment } from "react";

import { ReportActions } from "@/components/admin/report-actions";
import { ReportUpdateBanner } from "@/components/admin/report-update-banner";
import { listCommentsByIds } from "@/server/queries/comment.queries";
import { listReportAuditsByReportIds } from "@/server/queries/report-audit.queries";
import { listReports } from "@/server/queries/report.queries";
import { listUsersByIds } from "@/server/queries/user.queries";

type ReportsPageProps = {
  searchParams?: Promise<{ status?: ReportStatus; updated?: string }>;
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

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const status = Object.values(ReportStatus).includes(
    resolvedParams.status as ReportStatus,
  )
    ? (resolvedParams.status as ReportStatus)
    : ReportStatus.PENDING;
  const showUpdated = resolvedParams.updated === "1";
  const reports = await listReports({ status });
  const reportIds = reports.map((report) => report.id);
  const commentIds = reports
    .filter((report) => report.targetType === ReportTarget.COMMENT)
    .map((report) => report.targetId);
  const comments = await listCommentsByIds(commentIds);
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));
  const audits = await listReportAuditsByReportIds(reportIds);
  const auditMap = new Map<string, typeof audits>();
  for (const audit of audits) {
    const existing = auditMap.get(audit.reportId) ?? [];
    existing.push(audit);
    auditMap.set(audit.reportId, existing);
  }
  const resolvedByIds = Array.from(
    new Set(
      reports
        .map((report) => report.resolvedBy)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const resolvers = await listUsersByIds(resolvedByIds);
  const resolverMap = new Map(resolvers.map((user) => [user.id, user]));

  const formatResolvedAt = (date: Date | null) =>
    date ? date.toLocaleString("ko-KR") : "-";

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Moderation
          </p>
          <h1 className="text-2xl font-semibold">신고 큐</h1>
          <p className="text-sm text-[#6f6046]">
            PENDING 상태의 신고를 검토하고 처리합니다.
          </p>
        </header>

        {showUpdated ? (
          <ReportUpdateBanner message="신고 처리 결과가 반영되었습니다." />
        ) : null}

        <section className="flex flex-wrap items-center gap-2 text-xs text-[#6f6046]">
          {Object.values(ReportStatus).map((value) => (
            <Link
              key={value}
              href={`/admin/reports?status=${value}`}
              className={`rounded-md border px-2.5 py-1 transition ${
                status === value
                  ? "border-[#2a241c] bg-[#2a241c] text-white"
                  : "border-[#e3d6c4] bg-white"
              }`}
            >
              {statusLabels[value]}
            </Link>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#e3d6c4] bg-white shadow-sm">
          {reports.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#9a8462]">
              선택한 상태의 신고가 없습니다.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fdf9f2] text-xs uppercase tracking-[0.2em] text-[#9a8462]">
                <tr>
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
                {reports.map((report) => {
                  const reportAudits = auditMap.get(report.id) ?? [];

                  return (
                    <Fragment key={report.id}>
                      <tr className="border-t border-[#efe4d4]">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {report.post ? (
                          <Link
                            href={`/posts/${report.post.id}`}
                            className="font-semibold text-[#2a241c]"
                          >
                            {report.post.title}
                          </Link>
                        ) : report.targetType === ReportTarget.COMMENT ? (
                          <Link
                            href={
                              commentMap.get(report.targetId)
                                ? `/posts/${commentMap.get(report.targetId)?.postId}`
                                : `/posts/${report.targetId}`
                            }
                            className="font-semibold text-[#2a241c]"
                          >
                            {commentMap.get(report.targetId)
                              ? `댓글: ${commentMap
                                  .get(report.targetId)
                                  ?.content.slice(0, 40)}`
                              : report.targetId}
                          </Link>
                        ) : (
                          <span className="text-[#6f6046]">{report.targetId}</span>
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
                        <td className="px-4 py-3 text-xs text-[#6f6046]">
                          {report.reason}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6f6046]">
                          {report.description ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6f6046]">
                          {report.reporter.nickname ?? report.reporter.email}
                        </td>
                        <td className="px-4 py-3">
                          <ReportActions reportId={report.id} status={report.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6f6046]">
                          {report.resolution ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6f6046]">
                          {report.resolvedBy
                            ? resolverMap.get(report.resolvedBy)?.nickname ??
                              resolverMap.get(report.resolvedBy)?.email ??
                              report.resolvedBy
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6f6046]">
                          {formatResolvedAt(report.resolvedAt)}
                        </td>
                      </tr>
                      <tr className="border-t border-[#efe4d4] bg-[#fdf9f2]">
                        <td colSpan={9} className="px-4 py-3 text-xs text-[#6f6046]">
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
                              처리 이력
                            </span>
                            {reportAudits.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {reportAudits.map((audit) => (
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
                                      {audit.resolver?.nickname ??
                                        audit.resolver?.email ??
                                        audit.resolvedBy ??
                                        "-"}
                                    </span>
                                    <span className="text-xs text-[#9a8462]">
                                      {formatResolvedAt(audit.createdAt)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-[#9a8462]">
                                이력 없음
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
