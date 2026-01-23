import Link from "next/link";
import { ReportStatus, ReportTarget } from "@prisma/client";

import { ReportActions } from "@/components/admin/report-actions";
import { listCommentsByIds } from "@/server/queries/comment.queries";
import { listReportAuditsByReportIds } from "@/server/queries/report-audit.queries";
import { getReportById } from "@/server/queries/report.queries";
import { listUsersByIds } from "@/server/queries/user.queries";

type ReportDetailPageProps = {
  params: { id: string };
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

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const report = await getReportById(params.id);

  if (!report) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
          <p className="text-sm text-[#6f6046]">신고를 찾을 수 없습니다.</p>
          <Link href="/admin/reports" className="text-xs text-[#9a8462]">
            신고 큐로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const commentTargetIds =
    report.targetType === ReportTarget.COMMENT ? [report.targetId] : [];
  const comments = await listCommentsByIds(commentTargetIds);
  const comment = comments[0];

  const audits = await listReportAuditsByReportIds([report.id]);
  const targetUserIds = report.targetUserId ? [report.targetUserId] : [];
  const targetUsers = await listUsersByIds(targetUserIds);
  const targetUser = targetUsers[0];

  const formatDateTime = (date: Date | null) =>
    date ? date.toLocaleString("ko-KR") : "-";

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Moderation
          </p>
          <h1 className="text-2xl font-semibold">신고 상세</h1>
          <p className="text-sm text-[#6f6046]">
            신고 처리 내역과 감사 로그를 확인합니다.
          </p>
        </header>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
                상태
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    report.status === ReportStatus.PENDING
                      ? "bg-[#f2c07c] text-[#2a241c]"
                      : report.status === ReportStatus.RESOLVED
                        ? "bg-[#2a241c] text-white"
                        : "bg-[#cbbba5] text-white"
                  }`}
                >
                  {statusLabels[report.status]}
                </span>
                <span className="text-xs text-[#9a8462]">
                  신고 ID: {report.id}
                </span>
              </div>
            </div>
            <div className="grid gap-1 text-xs text-[#6f6046]">
              <span>대상: {targetLabels[report.targetType]}</span>
              <span>신고 시간: {formatDateTime(report.createdAt)}</span>
            </div>
          </div>
          <div className="mt-6 grid gap-4 text-sm text-[#6f6046]">
            <div>
              대상 ID: {report.targetId}
            </div>
            <div>사유: {report.reason}</div>
            <div>설명: {report.description ?? "-"}</div>
            <div>
              신고자: {report.reporter.nickname ?? report.reporter.email}
            </div>
            <div>
              처리자: {report.resolvedBy ?? "-"}
            </div>
            <div>처리 메모: {report.resolution ?? "-"}</div>
            <div>처리 시간: {formatDateTime(report.resolvedAt)}</div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3d6c4] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
              Reporter
            </p>
            <p className="mt-2 text-sm font-semibold text-[#2a241c]">
              {report.reporter.nickname ?? report.reporter.email}
            </p>
            <p className="text-xs text-[#6f6046]">신고자</p>
          </div>
          <div className="rounded-2xl border border-[#e3d6c4] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
              Target
            </p>
            <p className="mt-2 text-sm font-semibold text-[#2a241c]">
              {targetLabels[report.targetType]}
            </p>
            <p className="text-xs text-[#6f6046]">신고 대상</p>
          </div>
          <div className="rounded-2xl border border-[#e3d6c4] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
              Resolution
            </p>
            <p className="mt-2 text-sm font-semibold text-[#2a241c]">
              {report.resolution ?? "미처리"}
            </p>
            <p className="text-xs text-[#6f6046]">처리 메모</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">대상 정보</h2>
          <div className="mt-4 text-sm text-[#6f6046]">
            {report.post ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#e3d6c4] bg-white px-2 py-0.5 text-[10px] text-[#6f6046]">
                    게시글
                  </span>
                  <span className="rounded-full border border-[#e3d6c4] bg-white px-2 py-0.5 text-[10px] text-[#6f6046]">
                    {report.post.status}
                  </span>
                </div>
                <Link
                  href={`/posts/${report.post.id}`}
                  className="font-semibold text-[#2a241c]"
                >
                  {report.post.title}
                </Link>
                <span className="text-xs text-[#9a8462]">게시글로 이동</span>
              </div>
            ) : report.targetType === ReportTarget.COMMENT && comment ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#e3d6c4] bg-white px-2 py-0.5 text-[10px] text-[#6f6046]">
                    댓글
                  </span>
                  <span className="text-xs text-[#9a8462]">
                    {comment.author.nickname ?? comment.author.name ?? "익명"}
                  </span>
                </div>
                <span>{comment.content}</span>
                <Link
                  href={`/posts/${comment.postId}`}
                  className="text-xs text-[#9a8462]"
                >
                  댓글 위치로 이동
                </Link>
              </div>
            ) : report.targetType === ReportTarget.USER && targetUser ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#e3d6c4] bg-white px-2 py-0.5 text-[10px] text-[#6f6046]">
                    사용자
                  </span>
                </div>
                <span className="font-semibold text-[#2a241c]">
                  {targetUser.nickname ?? targetUser.email}
                </span>
                <span className="text-xs text-[#9a8462]">신고 대상</span>
              </div>
            ) : (
              <div>대상을 찾을 수 없습니다.</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">처리 작업</h2>
          <div className="mt-4">
            <ReportActions
              reportId={report.id}
              status={report.status}
              redirectTo="/admin/reports?updated=1"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">처리 이력</h2>
          <div className="mt-4 flex flex-col gap-2 text-sm text-[#6f6046]">
            {audits.length > 0 ? (
              audits.map((audit) => (
                <div key={audit.id} className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#e3d6c4] bg-white px-2 py-0.5 text-[10px] text-[#6f6046]">
                    {statusLabels[audit.status]}
                  </span>
                  <span>{audit.resolution ?? "메모 없음"}</span>
                  <span className="text-xs text-[#9a8462]">
                    {audit.resolver?.nickname ??
                      audit.resolver?.email ??
                      audit.resolvedBy ??
                      "-"}
                  </span>
                  <span className="text-xs text-[#9a8462]">
                    {formatDateTime(audit.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-[#9a8462]">이력 없음</span>
            )}
          </div>
        </section>

        <Link href="/admin/reports" className="text-xs text-[#9a8462]">
          신고 큐로 돌아가기
        </Link>
      </main>
    </div>
  );
}
