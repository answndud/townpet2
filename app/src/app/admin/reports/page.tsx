import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportReason, ReportStatus, ReportTarget, UserRole } from "@prisma/client";

import { ReportQueueTable } from "@/components/admin/report-queue-table";
import { ReportUpdateBanner } from "@/components/admin/report-update-banner";
import { getCurrentUser } from "@/server/auth";
import { listCommentsByIds } from "@/server/queries/comment.queries";
import { listReportAuditsByReportIds } from "@/server/queries/report-audit.queries";
import { getReportStats, listReports } from "@/server/queries/report.queries";
import { listUsersByIds } from "@/server/queries/user.queries";

type ReportsPageProps = {
  searchParams?: Promise<{ status?: string; target?: string; updated?: string }>;
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

const reasonLabels: Record<ReportReason, string> = {
  SPAM: "스팸",
  HARASSMENT: "괴롭힘",
  INAPPROPRIATE: "부적절",
  FAKE: "허위",
  OTHER: "기타",
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isModerator =
    user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

  if (!isModerator) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
          <h1 className="text-xl font-semibold">접근 권한이 없습니다.</h1>
          <p className="text-sm text-[#6f6046]">
            신고 큐는 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/" className="text-xs text-[#9a8462]">
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const resolvedParams = (await searchParams) ?? {};
  const statusParam = resolvedParams.status ?? ReportStatus.PENDING;
  const status =
    statusParam === "ALL" || Object.values(ReportStatus).includes(statusParam as ReportStatus)
      ? (statusParam as ReportStatus | "ALL")
      : ReportStatus.PENDING;
  const targetParam = resolvedParams.target ?? "ALL";
  const targetType =
    targetParam === "ALL" || Object.values(ReportTarget).includes(targetParam as ReportTarget)
      ? (targetParam as ReportTarget | "ALL")
      : "ALL";
  const showUpdated = resolvedParams.updated === "1";
  const [reports, stats] = await Promise.all([
    listReports({ status, targetType }),
    getReportStats(7),
  ]);
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

  const reportRows = reports.map((report) => {
    const targetTitle = report.post
      ? report.post.title
      : report.targetType === ReportTarget.COMMENT
        ? commentMap.get(report.targetId)
          ? `댓글: ${commentMap.get(report.targetId)?.content.slice(0, 40)}`
          : report.targetId
        : report.targetId;
    const targetHref = report.post
      ? `/posts/${report.post.id}`
      : report.targetType === ReportTarget.COMMENT
        ? commentMap.get(report.targetId)
          ? `/posts/${commentMap.get(report.targetId)?.postId}`
          : undefined
        : undefined;
    const auditsForReport = auditMap.get(report.id) ?? [];

    return {
      id: report.id,
      targetType: report.targetType,
      targetTitle,
      targetHref,
      status: report.status,
      reason: reasonLabels[report.reason] ?? report.reason,
      description: report.description ?? null,
      reporterLabel: report.reporter.nickname ?? report.reporter.email,
      resolution: report.resolution ?? null,
      resolvedByLabel: report.resolvedBy
        ? resolverMap.get(report.resolvedBy)?.nickname ??
          resolverMap.get(report.resolvedBy)?.email ??
          report.resolvedBy
        : null,
      resolvedAtLabel: formatResolvedAt(report.resolvedAt),
      audits: auditsForReport.map((audit) => ({
        id: audit.id,
        status: audit.status,
        resolution: audit.resolution ?? null,
        resolverLabel:
          audit.resolver?.nickname ??
          audit.resolver?.email ??
          audit.resolvedBy ??
          "-",
        createdAt: formatResolvedAt(audit.createdAt),
      })),
    };
  });

  const buildLink = (nextStatus: ReportStatus | "ALL", nextTarget: ReportTarget | "ALL") => {
    const params = new URLSearchParams();
    params.set("status", nextStatus);
    if (nextTarget !== "ALL") {
      params.set("target", nextTarget);
    }
    return `/admin/reports?${params.toString()}`;
  };

  const averageResolutionLabel = stats.averageResolutionHours
    ? `${stats.averageResolutionHours.toFixed(1)}시간`
    : "-";

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

        <section className="grid gap-4 rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm md:grid-cols-3">
          <div className="rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">전체 신고</p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {stats.totalCount}
            </p>
            <p className="text-xs text-[#6f6046]">누적 신고 수</p>
          </div>
          <div className="rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">미처리</p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {stats.statusCounts[ReportStatus.PENDING]}
            </p>
            <p className="text-xs text-[#6f6046]">대기 중 신고</p>
          </div>
          <div className="rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">승인</p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {stats.statusCounts[ReportStatus.RESOLVED]}
            </p>
            <p className="text-xs text-[#6f6046]">처리 완료</p>
          </div>
          <div className="rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">기각</p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {stats.statusCounts[ReportStatus.DISMISSED]}
            </p>
            <p className="text-xs text-[#6f6046]">기각 완료</p>
          </div>
          <div className="rounded-xl border border-[#efe4d4] bg-[#fdf9f2] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">평균 처리</p>
            <p className="mt-2 text-2xl font-semibold text-[#2a241c]">
              {averageResolutionLabel}
            </p>
            <p className="text-xs text-[#6f6046]">처리까지 평균 시간</p>
          </div>
          <div className="rounded-xl border border-[#efe4d4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">사유 분포</p>
            <div className="mt-3 flex flex-col gap-2 text-xs text-[#6f6046]">
              {Object.entries(stats.reasonCounts).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span>{reasonLabels[reason as ReportReason]}</span>
                  <span className="font-semibold text-[#2a241c]">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#efe4d4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">대상 분포</p>
            <div className="mt-3 flex flex-col gap-2 text-xs text-[#6f6046]">
              {Object.entries(stats.targetCounts).map(([target, count]) => (
                <div key={target} className="flex items-center justify-between">
                  <span>{targetLabels[target as ReportTarget]}</span>
                  <span className="font-semibold text-[#2a241c]">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#efe4d4] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8462]">
              최근 {stats.dailyCounts.length}일
            </p>
            <div className="mt-3 flex flex-col gap-2 text-xs text-[#6f6046]">
              {stats.dailyCounts.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between">
                  <span>{entry.date.slice(5)}</span>
                  <span className="font-semibold text-[#2a241c]">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-[#e3d6c4] bg-white p-4 text-xs text-[#6f6046]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
              상태 필터
            </span>
            {["ALL", ...Object.values(ReportStatus)].map((value) => (
              <Link
                key={value}
                href={buildLink(value as ReportStatus | "ALL", targetType)}
                className={`rounded-md border px-2.5 py-1 transition ${
                  status === value
                    ? "border-[#2a241c] bg-[#2a241c] text-white"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                {value === "ALL" ? "전체" : statusLabels[value as ReportStatus]}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
              타입 필터
            </span>
            {["ALL", ...Object.values(ReportTarget)].map((value) => (
              <Link
                key={value}
                href={buildLink(status, value as ReportTarget | "ALL")}
                className={`rounded-md border px-2.5 py-1 transition ${
                  targetType === value
                    ? "border-[#2a241c] bg-[#2a241c] text-white"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                {value === "ALL"
                  ? "전체"
                  : targetLabels[value as ReportTarget]}
              </Link>
            ))}
          </div>
        </section>

        <ReportQueueTable reports={reportRows} />
      </main>
    </div>
  );
}
