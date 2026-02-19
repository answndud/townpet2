import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportReason, ReportStatus, ReportTarget, UserRole } from "@prisma/client";

import { ReportQueueTable } from "@/components/admin/report-queue-table";
import { ReportUpdateBanner } from "@/components/admin/report-update-banner";
import { getCurrentUser } from "@/server/auth";
import { listCommentsByIds } from "@/server/queries/comment.queries";
import { listReportAuditsByReportIds } from "@/server/queries/report-audit.queries";
import { getReportStats, listReports } from "@/server/queries/report.queries";
import { listRecentSanctions } from "@/server/queries/sanction.queries";
import { listUsersByIds } from "@/server/queries/user.queries";
import { formatSanctionLevelLabel } from "@/server/services/sanction.service";

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
        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
          <h1 className="text-xl font-semibold text-[#10284a]">접근 권한이 없습니다.</h1>
          <p className="text-sm text-[#4f678d]">
            신고 큐는 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/feed" className="text-xs text-[#5a7398]">
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

  const [reports, stats, sanctions] = await Promise.all([
    listReports({ status, targetType }),
    getReportStats(7),
    listRecentSanctions(15),
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
  const resolverMap = new Map(resolvers.map((resolver) => [resolver.id, resolver]));

  const formatResolvedAt = (date: Date | null) =>
    date ? date.toLocaleString("ko-KR") : "-";

  const reportRows = reports.map((report) => {
    const targetTitle =
      report.targetType === ReportTarget.POST
        ? report.post?.title ?? report.targetId
        : report.targetType === ReportTarget.COMMENT
          ? commentMap.get(report.targetId)
            ? `댓글: ${commentMap.get(report.targetId)?.content.slice(0, 40)}`
            : report.targetId
          : report.targetId;

    const targetHref =
      report.targetType === ReportTarget.POST
        ? report.post
          ? `/posts/${report.post.id}`
          : undefined
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
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            신고 큐
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            신고 접수 현황을 확인하고 대기 건을 처리합니다.
          </p>
        </header>

        {showUpdated ? (
          <ReportUpdateBanner message="신고 처리 결과가 반영되었습니다." />
        ) : null}

        <section className="grid gap-3 border border-[#c8d7ef] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-[#d8e4f6] bg-[#f8fbff] p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">전체 신고</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">{stats.totalCount}</p>
            <p className="text-xs text-[#4f678d]">누적 신고 수</p>
          </div>
          <div className="border border-[#d8e4f6] bg-[#f8fbff] p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">미처리</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">
              {stats.statusCounts[ReportStatus.PENDING]}
            </p>
            <p className="text-xs text-[#4f678d]">대기 중 신고</p>
          </div>
          <div className="border border-[#d8e4f6] bg-[#f8fbff] p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">승인</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">
              {stats.statusCounts[ReportStatus.RESOLVED]}
            </p>
            <p className="text-xs text-[#4f678d]">처리 완료</p>
          </div>
          <div className="border border-[#d8e4f6] bg-[#f8fbff] p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">기각</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">
              {stats.statusCounts[ReportStatus.DISMISSED]}
            </p>
            <p className="text-xs text-[#4f678d]">기각 완료</p>
          </div>
          <div className="border border-[#d8e4f6] bg-white p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">평균 처리</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">{averageResolutionLabel}</p>
            <p className="text-xs text-[#4f678d]">처리 평균 시간</p>
          </div>
          <div className="border border-[#d8e4f6] bg-white p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">사유 분포</p>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-[#4f678d]">
              {Object.entries(stats.reasonCounts).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span>{reasonLabels[reason as ReportReason]}</span>
                  <span className="font-semibold text-[#163462]">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-[#d8e4f6] bg-white p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">대상 분포</p>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-[#4f678d]">
              {Object.entries(stats.targetCounts).map(([target, count]) => (
                <div key={target} className="flex items-center justify-between">
                  <span>{targetLabels[target as ReportTarget]}</span>
                  <span className="font-semibold text-[#163462]">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-[#d8e4f6] bg-white p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">
              최근 {stats.dailyCounts.length}일
            </p>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-[#4f678d]">
              {stats.dailyCounts.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between">
                  <span>{entry.date.slice(5)}</span>
                  <span className="font-semibold text-[#163462]">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 border border-[#c8d7ef] bg-white p-4 text-xs text-[#4f678d]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              상태 필터
            </span>
            {["ALL", ...Object.values(ReportStatus)].map((value) => (
              <Link
                key={value}
                href={buildLink(value as ReportStatus | "ALL", targetType)}
                className={`border px-2.5 py-1 transition ${
                  status === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
                }`}
              >
                {value === "ALL" ? "전체" : statusLabels[value as ReportStatus]}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              타입 필터
            </span>
            {["ALL", ...Object.values(ReportTarget)].map((value) => (
              <Link
                key={value}
                href={buildLink(status, value as ReportTarget | "ALL")}
                className={`border px-2.5 py-1 transition ${
                  targetType === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
                }`}
              >
                {value === "ALL" ? "전체" : targetLabels[value as ReportTarget]}
              </Link>
            ))}
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#153a6a]">최근 제재 이력</h2>
            <span className="text-[11px] text-[#5a7398]">
              단계적 제재 흐름: 경고 → 7일 정지 → 30일 정지 → 영구 정지
            </span>
          </div>
          {sanctions.length === 0 ? (
            <p className="mt-3 text-xs text-[#5a7398]">아직 기록된 제재가 없습니다.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[#f6f9ff] text-[10px] uppercase tracking-[0.16em] text-[#5b78a1]">
                  <tr>
                    <th className="px-3 py-2">대상 사용자</th>
                    <th className="px-3 py-2">제재 단계</th>
                    <th className="px-3 py-2">사유</th>
                    <th className="px-3 py-2">처리자</th>
                    <th className="px-3 py-2">신고 ID</th>
                    <th className="px-3 py-2">만료</th>
                    <th className="px-3 py-2">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {sanctions.map((sanction) => (
                    <tr key={sanction.id} className="border-t border-[#e1e9f5] text-[#27466f]">
                      <td className="px-3 py-2">
                        {sanction.user.nickname ?? sanction.user.email}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[#163462]">
                        {formatSanctionLevelLabel(sanction.level)}
                      </td>
                      <td className="max-w-[260px] truncate px-3 py-2" title={sanction.reason}>
                        {sanction.reason}
                      </td>
                      <td className="px-3 py-2">
                        {sanction.moderator.nickname ?? sanction.moderator.email}
                      </td>
                      <td className="px-3 py-2">
                        {sanction.sourceReportId ? (
                          <Link
                            href={`/admin/reports/${sanction.sourceReportId}`}
                            className="text-[#2f5da4] hover:underline"
                          >
                            {sanction.sourceReportId}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {sanction.expiresAt
                          ? sanction.expiresAt.toLocaleString("ko-KR")
                          : "없음"}
                      </td>
                      <td className="px-3 py-2">{sanction.createdAt.toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ReportQueueTable reports={reportRows} />
      </main>
    </div>
  );
}
