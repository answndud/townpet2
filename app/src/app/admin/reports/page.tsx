import Link from "next/link";
import { ReportStatus, ReportTarget } from "@prisma/client";

import { ReportActions } from "@/components/admin/report-actions";
import { listCommentsByIds } from "@/server/queries/comment.queries";
import { listReports } from "@/server/queries/report.queries";

type ReportsPageProps = {
  searchParams?: Promise<{ status?: ReportStatus }>;
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
  const reports = await listReports({ status });
  const commentIds = reports
    .filter((report) => report.targetType === ReportTarget.COMMENT)
    .map((report) => report.targetId);
  const comments = await listCommentsByIds(commentIds);
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));

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
                  <th className="px-4 py-3">사유</th>
                  <th className="px-4 py-3">설명</th>
                  <th className="px-4 py-3">신고자</th>
                  <th className="px-4 py-3">처리</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t border-[#efe4d4]">
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6f6046]">
                      {targetLabels[report.targetType]}
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
                      <ReportActions reportId={report.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
