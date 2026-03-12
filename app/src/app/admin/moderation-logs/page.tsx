import Link from "next/link";
import {
  ModerationActionType,
  ModerationTargetType,
} from "@prisma/client";

import { EmptyState } from "@/components/ui/empty-state";
import { requireModeratorPageUser } from "@/server/admin-page-access";
import { listModerationActionLogs } from "@/server/queries/moderation-action.queries";

type ModerationLogsPageProps = {
  searchParams?: Promise<{ action?: string; q?: string }>;
};

const actionLabels: Record<ModerationActionType, string> = {
  REPORT_RESOLVED: "신고 승인",
  REPORT_DISMISSED: "신고 기각",
  TARGET_HIDDEN: "대상 숨김",
  TARGET_UNHIDDEN: "숨김 해제",
  SANCTION_ISSUED: "제재 부여",
  HOSPITAL_REVIEW_FLAGGED: "병원후기 의심 신호",
};

const targetLabels: Record<ModerationTargetType, string> = {
  POST: "게시글",
  COMMENT: "댓글",
  USER: "사용자",
};

function buildTargetHref(targetType: ModerationTargetType, targetId: string, metadata: unknown) {
  if (targetType === ModerationTargetType.POST) {
    return `/posts/${targetId}`;
  }

  if (targetType === ModerationTargetType.USER) {
    return `/users/${targetId}`;
  }

  if (
    targetType === ModerationTargetType.COMMENT &&
    metadata &&
    typeof metadata === "object" &&
    "postId" in metadata &&
    typeof metadata.postId === "string"
  ) {
    return `/posts/${metadata.postId}#comment-${targetId}`;
  }

  return null;
}

function summarizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return "-";
  }

  const entries = Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ")}`;
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${key}: ${String(value)}`;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  if (entries.length === 0) {
    return "-";
  }

  return entries.slice(0, 3).join(" / ");
}

export default async function ModerationLogsPage({ searchParams }: ModerationLogsPageProps) {
  await requireModeratorPageUser();

  const resolvedParams = (await searchParams) ?? {};
  const actionParam = resolvedParams.action ?? "ALL";
  const action =
    actionParam === "ALL" ||
    Object.values(ModerationActionType).includes(actionParam as ModerationActionType)
      ? (actionParam as ModerationActionType | "ALL")
      : "ALL";
  const query = resolvedParams.q?.trim() ?? "";

  const logs = await listModerationActionLogs({
    action: action === "ALL" ? null : action,
    query: query || null,
    limit: 100,
  });

  const buildLink = (nextAction: ModerationActionType | "ALL") => {
    const params = new URLSearchParams();
    params.set("action", nextAction);
    if (query) {
      params.set("q", query);
    }
    return `/admin/moderation-logs?${params.toString()}`;
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            모더레이션 로그
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            신고 처리, 대상 숨김/복구, 제재 부여, 병원후기 의심 신호를 한곳에서 추적합니다.
          </p>
        </header>

        <section className="tp-card flex flex-col gap-3 p-4 text-xs text-[#4f678d]">
          <form className="flex flex-wrap items-center gap-2" action="">
            <input
              name="q"
              defaultValue={query}
              placeholder="사용자/대상 ID/신고 ID 검색"
              className="tp-input-soft w-full max-w-xs bg-white px-3 py-2 text-xs"
            />
            <button type="submit" className="tp-btn-primary px-3 py-2 text-xs font-semibold">
              검색
            </button>
            {query ? (
              <Link href={buildLink(action)} className="text-xs text-[#5a7398]">
                초기화
              </Link>
            ) : null}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              액션 필터
            </span>
            {["ALL", ...Object.values(ModerationActionType)].map((value) => (
              <Link
                key={value}
                href={buildLink(value as ModerationActionType | "ALL")}
                className={`rounded-lg border px-2.5 py-1 transition ${
                  action === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
                }`}
              >
                {value === "ALL" ? "전체" : actionLabels[value as ModerationActionType]}
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/moderation/direct">직접 모더레이션</Link>
          <Link href="/admin/hospital-review-flags">병원 후기 의심 신호</Link>
          <Link href="/admin/auth-audits">인증 감사 로그</Link>
        </div>

        <section className="tp-card p-4 sm:p-5">
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-xs text-[#355988]">
                <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
                  <tr>
                    <th className="py-2">액션</th>
                    <th className="py-2">처리자</th>
                    <th className="py-2">대상</th>
                    <th className="py-2">대상 사용자</th>
                    <th className="py-2">신고</th>
                    <th className="py-2">메타</th>
                    <th className="py-2">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const targetHref = buildTargetHref(log.targetType, log.targetId, log.metadata);
                    return (
                      <tr key={log.id} className="border-b border-[#e6edf8]">
                        <td className="py-3 font-semibold text-[#163462]">
                          {actionLabels[log.action]}
                        </td>
                        <td className="py-3">
                          <div className="text-[#1f3f71]">
                            {log.actor.nickname ?? log.actor.email}
                          </div>
                          <div className="text-[10px] text-[#5a7398]">{log.actor.id}</div>
                        </td>
                        <td className="py-3">
                          <div className="text-[#1f3f71]">{targetLabels[log.targetType]}</div>
                          {targetHref ? (
                            <Link href={targetHref} className="text-[10px] text-[#3567b5]">
                              {log.targetId}
                            </Link>
                          ) : (
                            <div className="text-[10px] text-[#5a7398]">{log.targetId}</div>
                          )}
                        </td>
                        <td className="py-3">
                          {log.targetUser ? (
                            <>
                              <div className="text-[#1f3f71]">
                                {log.targetUser.nickname ?? log.targetUser.email}
                              </div>
                              <div className="text-[10px] text-[#5a7398]">
                                {log.targetUser.id}
                              </div>
                            </>
                          ) : (
                            <span className="text-[#5a7398]">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {log.reportId ? (
                            <Link
                              href={`/admin/reports/${log.reportId}`}
                              className="text-[#3567b5]"
                            >
                              {log.reportId}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="max-w-[320px] py-3 text-[#4f678d]">
                          <span className="line-clamp-2">{summarizeMetadata(log.metadata)}</span>
                        </td>
                        <td className="py-3">{log.createdAt.toLocaleString("ko-KR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="모더레이션 로그가 없습니다"
              description="필터 조건을 바꾸거나 다른 기간에서 다시 확인해 주세요."
            />
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/moderation/direct">직접 모더레이션</Link>
          <Link href="/admin/auth-audits">인증 로그</Link>
        </div>
      </main>
    </div>
  );
}
