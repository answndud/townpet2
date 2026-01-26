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
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
          <h1 className="text-xl font-semibold">접근 권한이 없습니다.</h1>
          <p className="text-sm text-[#6f6046]">
            보안 감사 로그는 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/" className="text-xs text-[#9a8462]">
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const resolvedParams = (await searchParams) ?? {};
  const actionParam = resolvedParams.action ?? "ALL";
  const action =
    actionParam === "ALL" || Object.values(AuthAuditAction).includes(actionParam as AuthAuditAction)
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

  const formatDateTime = (date: Date) => date.toLocaleString("ko-KR");

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
            Security
          </p>
          <h1 className="text-2xl font-semibold">인증 감사 로그</h1>
          <p className="text-sm text-[#6f6046]">
            비밀번호 설정/변경/재설정 기록을 확인합니다.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border border-[#e3d6c4] bg-white p-4 text-xs text-[#6f6046]">
          <form className="flex flex-wrap items-center gap-2" action="">
            <input
              name="q"
              defaultValue={query}
              placeholder="이메일/닉네임/ID/IP 검색"
              className="w-full max-w-xs rounded-md border border-[#e3d6c4] bg-white px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-md border border-[#e3d6c4] bg-white px-3 py-2 text-xs"
            >
              검색
            </button>
            {query ? (
              <Link href={buildLink(action)} className="text-xs text-[#9a8462]">
                초기화
              </Link>
            ) : null}
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
              액션 필터
            </span>
            {["ALL", ...Object.values(AuthAuditAction)].map((value) => (
              <Link
                key={value}
                href={buildLink(value as AuthAuditAction | "ALL")}
                className={`rounded-md border px-2.5 py-1 transition ${
                  action === value
                    ? "border-[#2a241c] bg-[#2a241c] text-white"
                    : "border-[#e3d6c4] bg-white"
                }`}
              >
                {value === "ALL" ? "전체" : actionLabels[value as AuthAuditAction]}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          {audits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#6f6046]">
                <thead className="border-b border-[#e3d6c4] text-[10px] uppercase tracking-[0.3em] text-[#9a8462]">
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
                    <tr key={audit.id} className="border-b border-[#f0e6d8]">
                      <td className="py-3 font-semibold text-[#2a241c]">
                        {actionLabels[audit.action]}
                      </td>
                      <td className="py-3">
                        <div className="text-[#2a241c]">
                          {audit.user.nickname ?? audit.user.email}
                        </div>
                        <div className="text-[10px] text-[#9a8462]">{audit.user.id}</div>
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
            <p className="text-xs text-[#9a8462]">기록이 없습니다.</p>
          )}
        </section>

        <Link href="/admin/reports" className="text-xs text-[#9a8462]">
          신고 큐로 이동
        </Link>
      </main>
    </div>
  );
}
