import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthAuditAction, UserRole } from "@prisma/client";

import { getCurrentUser } from "@/server/auth";
import { listAuthAuditLogs } from "@/server/queries/auth-audit.queries";

type AuthAuditPageProps = {
  searchParams?: Promise<{ action?: string; q?: string }>;
};

const actionLabels: Record<AuthAuditAction, string> = {
  PASSWORD_SET: "비밀번호 설정",
  PASSWORD_CHANGE: "비밀번호 변경",
  PASSWORD_RESET: "비밀번호 재설정",
};

export default async function AuthAuditPage({ searchParams }: AuthAuditPageProps) {
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
            보안 감사 로그는 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/feed" className="text-xs text-[#5a7398]">
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const resolvedParams = (await searchParams) ?? {};
  const actionParam = resolvedParams.action ?? "ALL";
  const action =
    actionParam === "ALL" ||
    Object.values(AuthAuditAction).includes(actionParam as AuthAuditAction)
      ? (actionParam as AuthAuditAction | "ALL")
      : "ALL";
  const query = resolvedParams.q?.trim() ?? "";

  const audits = await listAuthAuditLogs({
    action: action === "ALL" ? null : action,
    query: query || null,
    limit: 100,
  });

  const buildLink = (nextAction: AuthAuditAction | "ALL") => {
    const params = new URLSearchParams();
    params.set("action", nextAction);
    if (query) {
      params.set("q", query);
    }
    return `/admin/auth-audits?${params.toString()}`;
  };

  const exportParams = new URLSearchParams();
  if (action !== "ALL") {
    exportParams.set("action", action);
  }
  if (query) {
    exportParams.set("q", query);
  }
  const exportLink = `/api/admin/auth-audits/export?${exportParams.toString()}`;

  const formatDateTime = (date: Date) => date.toLocaleString("ko-KR");

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            인증 감사 로그
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            비밀번호 설정/변경/재설정 기록을 확인합니다.
          </p>
        </header>

        <section className="flex flex-col gap-3 border border-[#c8d7ef] bg-white p-4 text-xs text-[#4f678d]">
          <form className="flex flex-wrap items-center gap-2" action="">
            <input
              name="q"
              defaultValue={query}
              placeholder="이메일/닉네임/ID/IP 검색"
              className="w-full max-w-xs border border-[#bfd0ec] bg-white px-3 py-2 text-xs text-[#1f3f71]"
            />
            <button
              type="submit"
              className="border border-[#3567b5] bg-[#3567b5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
            >
              검색
            </button>
            {query ? (
              <Link href={buildLink(action)} className="text-xs text-[#5a7398]">
                초기화
              </Link>
            ) : null}
            <Link
              href={exportLink}
              className="border border-[#bfd0ec] bg-white px-3 py-2 text-xs text-[#315484] transition hover:bg-[#f3f7ff]"
            >
              CSV 내보내기
            </Link>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              액션 필터
            </span>
            {["ALL", ...Object.values(AuthAuditAction)].map((value) => (
              <Link
                key={value}
                href={buildLink(value as AuthAuditAction | "ALL")}
                className={`border px-2.5 py-1 transition ${
                  action === value
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
                }`}
              >
                {value === "ALL" ? "전체" : actionLabels[value as AuthAuditAction]}
              </Link>
            ))}
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-4 sm:p-5">
          {audits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs text-[#355988]">
                <thead className="border-b border-[#dbe6f6] text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
                  <tr>
                    <th className="py-2">액션</th>
                    <th className="py-2">사용자</th>
                    <th className="py-2">IP</th>
                    <th className="py-2">User Agent</th>
                    <th className="py-2">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit.id} className="border-b border-[#e6edf8]">
                      <td className="py-3 font-semibold text-[#163462]">
                        {actionLabels[audit.action]}
                      </td>
                      <td className="py-3">
                        <div className="text-[#1f3f71]">
                          {audit.user.nickname ?? audit.user.email}
                        </div>
                        <div className="text-[10px] text-[#5a7398]">{audit.user.id}</div>
                      </td>
                      <td className="py-3">{audit.ipAddress ?? "-"}</td>
                      <td className="py-3">
                        <span className="line-clamp-2 max-w-[320px]">{audit.userAgent ?? "-"}</span>
                      </td>
                      <td className="py-3">{formatDateTime(audit.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#5a7398]">기록이 없습니다.</p>
          )}
        </section>

        <Link href="/admin/reports" className="text-xs text-[#5a7398]">
          신고 큐로 이동
        </Link>
      </main>
    </div>
  );
}
