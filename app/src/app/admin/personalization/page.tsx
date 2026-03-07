import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { EmptyState } from "@/components/ui/empty-state";
import {
  FEED_AUDIENCE_SOURCE_LABELS,
  FEED_PERSONALIZATION_SURFACE_LABELS,
} from "@/lib/feed-personalization-metrics";
import { adminFeedPersonalizationQuerySchema } from "@/lib/validations/feed-personalization";
import { getCurrentUser } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { getFeedPersonalizationOverview } from "@/server/queries/feed-personalization-metrics.queries";

type PersonalizationPageProps = {
  searchParams?: Promise<{ days?: string }>;
};

const SUPPORTED_DAYS = [7, 14, 30] as const;

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function PersonalizationPage({
  searchParams,
}: PersonalizationPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: user.nickname,
  });

  const isModerator =
    user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;

  if (!isModerator) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-10 sm:px-6">
          <h1 className="text-xl font-semibold text-[#10284a]">접근 권한이 없습니다.</h1>
          <p className="text-sm text-[#4f678d]">
            개인화 지표는 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/feed" className="text-xs text-[#5a7398]">
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const resolvedParams = (await searchParams) ?? {};
  const parsed = adminFeedPersonalizationQuerySchema.safeParse({
    days: resolvedParams.days ?? undefined,
  });
  const selectedDays = SUPPORTED_DAYS.includes(parsed.data?.days as 7 | 14 | 30)
    ? (parsed.data?.days as 7 | 14 | 30)
    : 14;

  const overview = await getFeedPersonalizationOverview(selectedDays);

  const buildLink = (days: (typeof SUPPORTED_DAYS)[number]) =>
    `/admin/personalization?days=${days}`;

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            개인화 반응 지표
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            맞춤 추천 피드 조회, 게시글 클릭, 광고 노출/클릭을 최근 기간 기준으로 확인합니다.
          </p>
        </header>

        <section className="tp-card flex flex-wrap items-center gap-2 p-4 text-xs text-[#4f678d]">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
            기간 필터
          </span>
          {SUPPORTED_DAYS.map((days) => (
            <Link
              key={days}
              href={buildLink(days)}
              className={`rounded-lg border px-2.5 py-1 transition ${
                selectedDays === days
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
              }`}
            >
              최근 {days}일
            </Link>
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="tp-card p-4">
            <p className="text-xs text-[#5a7398]">개인화 피드 조회</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">{overview.totals.viewCount}</p>
            <p className="mt-1 text-xs text-[#5a7398]">게시글 CTR {formatPercent(overview.totals.postCtr)}</p>
          </article>
          <article className="tp-card p-4">
            <p className="text-xs text-[#5a7398]">개인화 게시글 클릭</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">
              {overview.totals.postClickCount}
            </p>
            <p className="mt-1 text-xs text-[#5a7398]">조회 대비 클릭 수</p>
          </article>
          <article className="tp-card p-4">
            <p className="text-xs text-[#5a7398]">광고 노출</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">
              {overview.totals.adImpressionCount}
            </p>
            <p className="mt-1 text-xs text-[#5a7398]">광고 CTR {formatPercent(overview.totals.adCtr)}</p>
          </article>
          <article className="tp-card p-4">
            <p className="text-xs text-[#5a7398]">광고 클릭</p>
            <p className="mt-2 text-2xl font-bold text-[#10284a]">{overview.totals.adClickCount}</p>
            <p className="mt-1 text-xs text-[#5a7398]">노출 대비 클릭 수</p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="tp-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[#10284a]">일별 추이</h2>
                <p className="text-xs text-[#5a7398]">
                  최근 {overview.days}일 personalized feed/ad 반응 추이
                </p>
              </div>
            </div>
            {overview.dailySummaries.some(
              (summary) =>
                summary.viewCount > 0 ||
                summary.postClickCount > 0 ||
                summary.adImpressionCount > 0 ||
                summary.adClickCount > 0,
            ) ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs text-[#355988]">
                  <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
                    <tr>
                      <th className="py-2">날짜</th>
                      <th className="py-2">조회</th>
                      <th className="py-2">게시글 클릭</th>
                      <th className="py-2">게시글 CTR</th>
                      <th className="py-2">광고 노출</th>
                      <th className="py-2">광고 클릭</th>
                      <th className="py-2">광고 CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.dailySummaries.map((summary) => (
                      <tr key={summary.date} className="border-b border-[#e6edf8]">
                        <td className="py-3 font-semibold text-[#1f3f71]">{summary.date}</td>
                        <td className="py-3">{summary.viewCount}</td>
                        <td className="py-3">{summary.postClickCount}</td>
                        <td className="py-3">{formatPercent(summary.postCtr)}</td>
                        <td className="py-3">{summary.adImpressionCount}</td>
                        <td className="py-3">{summary.adClickCount}</td>
                        <td className="py-3">{formatPercent(summary.adCtr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="아직 개인화 반응 데이터가 없습니다"
                description="맞춤 추천 피드와 광고를 실제 사용하면 이 화면에 CTR 요약이 쌓입니다."
              />
            )}
          </article>

          <div className="grid gap-4">
            <article className="tp-card p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-[#10284a]">Surface 요약</h2>
              <div className="mt-4 space-y-3">
                {overview.surfaceSummaries.map((summary) => (
                  <div key={summary.surface} className="rounded-lg border border-[#dbe6f6] bg-[#f8fbff] p-3">
                    <p className="text-sm font-semibold text-[#1f3f71]">
                      {FEED_PERSONALIZATION_SURFACE_LABELS[summary.surface]}
                    </p>
                    <p className="mt-1 text-xs text-[#5a7398]">
                      조회 {summary.viewCount} / 게시글 CTR {formatPercent(summary.postCtr)} / 광고 CTR{" "}
                      {formatPercent(summary.adCtr)}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="tp-card p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-[#10284a]">신호 출처 요약</h2>
              <div className="mt-4 space-y-3">
                {overview.sourceSummaries.map((summary) => (
                  <div key={summary.source} className="rounded-lg border border-[#dbe6f6] bg-white p-3">
                    <p className="text-sm font-semibold text-[#1f3f71]">
                      {FEED_AUDIENCE_SOURCE_LABELS[summary.source]}
                    </p>
                    <p className="mt-1 text-xs text-[#5a7398]">
                      조회 {summary.viewCount} / 게시글 클릭 {summary.postClickCount} / 광고 노출{" "}
                      {summary.adImpressionCount}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="tp-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[#10284a]">상위 audience key</h2>
              <p className="text-xs text-[#5a7398]">
                최근 {overview.days}일 기준 반응량이 큰 audience key 순
              </p>
            </div>
          </div>
          {overview.topAudienceSummaries.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs text-[#355988]">
                <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
                  <tr>
                    <th className="py-2">Audience</th>
                    <th className="py-2">Breed</th>
                    <th className="py-2">조회</th>
                    <th className="py-2">게시글 클릭</th>
                    <th className="py-2">게시글 CTR</th>
                    <th className="py-2">광고 노출</th>
                    <th className="py-2">광고 클릭</th>
                    <th className="py-2">광고 CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topAudienceSummaries.map((summary) => (
                    <tr key={`${summary.audienceKey}:${summary.breedCode}`} className="border-b border-[#e6edf8]">
                      <td className="py-3 font-semibold text-[#1f3f71]">{summary.audienceKey}</td>
                      <td className="py-3">{summary.breedCode === "NONE" ? "-" : summary.breedCode}</td>
                      <td className="py-3">{summary.viewCount}</td>
                      <td className="py-3">{summary.postClickCount}</td>
                      <td className="py-3">{formatPercent(summary.postCtr)}</td>
                      <td className="py-3">{summary.adImpressionCount}</td>
                      <td className="py-3">{summary.adClickCount}</td>
                      <td className="py-3">{formatPercent(summary.adCtr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="상위 audience key 데이터가 없습니다"
              description="개인화 사용량이 쌓이면 품종/종 단위 반응 요약이 노출됩니다."
            />
          )}
        </section>

        <div className="flex flex-wrap gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/breeds">품종 사전</Link>
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/auth-audits">인증 로그</Link>
          <Link href="/admin/policies">정책 설정</Link>
        </div>
      </main>
    </div>
  );
}
