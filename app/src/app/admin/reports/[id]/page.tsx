import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportStatus, ReportTarget, UserRole } from "@prisma/client";

import { ReportActions } from "@/components/admin/report-actions";
import { getCurrentUser } from "@/server/auth";
import { listCommentsByIds } from "@/server/queries/comment.queries";
import { listReportAudits } from "@/server/queries/report-audit.queries";
import { getReportById } from "@/server/queries/report.queries";
import { listUsersByIds } from "@/server/queries/user.queries";

type ReportDetailPageProps = {
  params: { id: string };
  searchParams?: Promise<{ q?: string; order?: string }>;
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

export default async function ReportDetailPage({ params, searchParams }: ReportDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isModerator =
    user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

  if (!isModerator) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
          <h1 className="text-xl font-semibold text-[#10284a]">접근 권한이 없습니다.</h1>
          <p className="text-sm text-[#4f678d]">
            신고 상세 페이지는 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/" className="text-xs text-[#5a7398]">
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const report = await getReportById(params.id);

  if (!report) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
          <p className="text-sm text-[#4f678d]">신고를 찾을 수 없습니다.</p>
          <Link href="/admin/reports" className="text-xs text-[#5a7398]">
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

  const resolvedParams = (await searchParams) ?? {};
  const query = resolvedParams.q?.trim() ?? "";
  const order = resolvedParams.order === "asc" ? "asc" : "desc";
  const audits = await listReportAudits({
    reportId: report.id,
    query: query || undefined,
    order,
  });

  const targetUserIds = report.targetUserId ? [report.targetUserId] : [];
  const targetUsers = await listUsersByIds(targetUserIds);
  const targetUser = targetUsers[0];

  const resolverIds = report.resolvedBy ? [report.resolvedBy] : [];
  const resolvers = await listUsersByIds(resolverIds);
  const resolver = resolvers[0];

  const formatDateTime = (date: Date | null) =>
    date ? date.toLocaleString("ko-KR") : "-";

  const statusBadgeClass =
    report.status === ReportStatus.PENDING
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : report.status === ReportStatus.RESOLVED
        ? "border-[#3567b5] bg-[#3567b5] text-white"
        : "border-rose-300 bg-rose-50 text-rose-700";

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            신고 상세
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            신고 처리 내역과 감사 로그를 확인합니다.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.24em] text-[#5b78a1]">상태</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`border px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>
                  {statusLabels[report.status]}
                </span>
                <span className="text-xs text-[#5a7398]">신고 ID: {report.id}</span>
              </div>
            </div>
            <div className="grid gap-1 text-xs text-[#4f678d]">
              <span>대상: {targetLabels[report.targetType]}</span>
              <span>신고 시간: {formatDateTime(report.createdAt)}</span>
              <span>처리자: {resolver?.nickname ?? resolver?.email ?? report.resolvedBy ?? "-"}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-2 border-t border-[#e1e9f5] pt-4 text-sm text-[#355988]">
            <div>대상 ID: {report.targetId}</div>
            <div>사유: {report.reason}</div>
            <div>설명: {report.description ?? "-"}</div>
            <div>신고자: {report.reporter.nickname ?? report.reporter.email}</div>
            <div>처리 메모: {report.resolution ?? "-"}</div>
            <div>처리 시간: {formatDateTime(report.resolvedAt)}</div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="border border-[#d8e4f6] bg-[#f8fbff] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">신고자</p>
            <p className="mt-2 text-sm font-semibold text-[#163462]">
              {report.reporter.nickname ?? report.reporter.email}
            </p>
          </div>
          <div className="border border-[#d8e4f6] bg-[#f8fbff] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">신고 대상</p>
            <p className="mt-2 text-sm font-semibold text-[#163462]">
              {targetLabels[report.targetType]}
            </p>
          </div>
          <div className="border border-[#d8e4f6] bg-[#f8fbff] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">처리 메모</p>
            <p className="mt-2 text-sm font-semibold text-[#163462]">
              {report.resolution ?? "미처리"}
            </p>
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">대상 정보</h2>
          <div className="mt-4 text-sm text-[#355988]">
            {report.post ? (
              <div className="flex flex-col gap-2 border border-[#d8e4f6] bg-[#f8fbff] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-[#bfd0ec] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                    게시글
                  </span>
                  <span className="border border-[#bfd0ec] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                    {report.post.status}
                  </span>
                </div>
                <Link href={`/posts/${report.post.id}`} className="font-semibold text-[#163462]">
                  {report.post.title}
                </Link>
                <span className="text-xs text-[#5a7398]">게시글로 이동</span>
              </div>
            ) : report.targetType === ReportTarget.COMMENT && comment ? (
              <div className="flex flex-col gap-2 border border-[#d8e4f6] bg-[#f8fbff] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-[#bfd0ec] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                    댓글
                  </span>
                  <span className="text-xs text-[#5a7398]">
                    {comment.author.nickname ?? comment.author.name ?? "익명"}
                  </span>
                </div>
                <span>{comment.content}</span>
                <Link href={`/posts/${comment.postId}`} className="text-xs text-[#5a7398]">
                  댓글 위치로 이동
                </Link>
              </div>
            ) : report.targetType === ReportTarget.USER && targetUser ? (
              <div className="flex flex-col gap-2 border border-[#d8e4f6] bg-[#f8fbff] p-4">
                <span className="border border-[#bfd0ec] bg-white px-2 py-0.5 text-[10px] text-[#355988]">
                  사용자
                </span>
                <span className="border border-[#bfd0ec] bg-white px-3 py-1 text-xs font-semibold text-[#163462]">
                  {targetUser.nickname ?? targetUser.email}
                </span>
                <span className="text-xs text-[#5a7398]">신고 대상</span>
              </div>
            ) : (
              <div>대상을 찾을 수 없습니다.</div>
            )}
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">처리 작업</h2>
          <div className="mt-4">
            <ReportActions
              reportId={report.id}
              status={report.status}
              redirectTo="/admin/reports?updated=1"
            />
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">처리 이력</h2>
          <form className="mt-4 flex flex-wrap items-center gap-2 text-xs" action="">
            <input
              name="q"
              defaultValue={query}
              placeholder="처리자/메모/ID 검색"
              className="w-full max-w-xs border border-[#bfd0ec] bg-white px-3 py-2 text-xs text-[#1f3f71]"
            />
            <select
              name="order"
              defaultValue={order}
              className="border border-[#bfd0ec] bg-white px-3 py-2 text-xs text-[#315484]"
            >
              <option value="desc">최신순</option>
              <option value="asc">오래된순</option>
            </select>
            <button
              type="submit"
              className="border border-[#3567b5] bg-[#3567b5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
            >
              검색
            </button>
            {query ? (
              <Link href={`/admin/reports/${report.id}`} className="text-xs text-[#5a7398]">
                초기화
              </Link>
            ) : null}
          </form>

          <div className="mt-4 text-sm text-[#355988]">
            {audits.length > 0 ? (
              <div className="flex flex-col gap-4 border-l border-[#dbe6f6] pl-4">
                {audits.map((audit) => (
                  <div key={audit.id} className="relative pl-2">
                    <span className="absolute left-[-20px] top-1.5 h-2.5 w-2.5 border border-[#bfd0ec] bg-[#f8fbff]" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`border px-2 py-0.5 text-[10px] font-semibold ${
                          audit.status === ReportStatus.PENDING
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : audit.status === ReportStatus.RESOLVED
                              ? "border-[#3567b5] bg-[#3567b5] text-white"
                              : "border-rose-300 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {statusLabels[audit.status]}
                      </span>
                      <span>{audit.resolution ?? "메모 없음"}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5a7398]">
                      <span>
                        {audit.resolver?.nickname ??
                          audit.resolver?.email ??
                          audit.resolvedBy ??
                          "-"}
                      </span>
                      <span>{formatDateTime(audit.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#5a7398]">이력 없음</span>
            )}
          </div>
        </section>

        <Link href="/admin/reports" className="text-xs text-[#5a7398]">
          신고 큐로 돌아가기
        </Link>
      </main>
    </div>
  );
}
