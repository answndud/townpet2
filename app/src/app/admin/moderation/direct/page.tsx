import Link from "next/link";

import { DirectModerationPanel } from "@/components/admin/direct-moderation-panel";
import { requireModeratorPageUser } from "@/server/admin-page-access";

export default async function DirectModerationPage() {
  await requireModeratorPageUser();

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            직접 모더레이션
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            신고가 쌓이기 전에 분탕/스팸 계정을 바로 숨기거나 단계적으로 제재합니다.
          </p>
          <p className="mt-3 text-xs text-[#5a7398]">
            이 도구는 일반 사용자 계정만 대상으로 하며, 매크로는 아래 moderator API만 사용해야
            합니다.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/moderation-logs">모더레이션 로그</Link>
          <Link href="/admin/auth-audits">인증 감사 로그</Link>
        </div>

        <section className="tp-card grid gap-3 p-4 text-xs text-[#4f678d] lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              Macro Endpoint
            </p>
            <code className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-[11px] text-[#214b82]">
              POST /api/admin/moderation/users/hide-content
            </code>
            <code className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-[11px] text-[#214b82]">
              POST /api/admin/moderation/users/sanction
            </code>
            <code className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-[11px] text-[#214b82]">
              POST /api/admin/moderation/users/restore-content
            </code>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#5b78a1]">
              Recommended Flow
            </p>
            <p>1. `hide-content`로 최근 ACTIVE 글/댓글부터 숨깁니다.</p>
            <p>2. 반복 계정만 `sanction`으로 경고/정지 단계에 올립니다.</p>
            <p>3. 오탐이면 `restore-content`로 직접 숨김만 안전하게 복구합니다.</p>
            <p>4. 30일/영구 정지는 로그와 대상 콘텐츠를 함께 확인한 뒤 진행합니다.</p>
          </div>
        </section>

        <DirectModerationPanel />
      </main>
    </div>
  );
}
