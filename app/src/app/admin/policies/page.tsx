import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { ForbiddenKeywordPolicyForm } from "@/components/admin/forbidden-keyword-policy-form";
import { GuestPostPolicyForm } from "@/components/admin/guest-post-policy-form";
import { GuestReadPolicyForm } from "@/components/admin/guest-read-policy-form";
import { NewUserSafetyPolicyForm } from "@/components/admin/new-user-safety-policy-form";
import { postTypeMeta } from "@/lib/post-presenter";
import { getCurrentUser } from "@/server/auth";
import {
  getForbiddenKeywords,
  getGuestPostPolicy,
  getGuestReadLoginRequiredPostTypes,
  getNewUserSafetyPolicy,
} from "@/server/queries/policy.queries";

export default async function AdminPoliciesPage() {
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
            정책 설정은 관리자 또는 운영자만 접근할 수 있습니다.
          </p>
          <Link href="/feed" className="text-xs text-[#5a7398]">
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const [loginRequiredTypes, forbiddenKeywords, newUserSafetyPolicy, guestPostPolicy] = await Promise.all([
    getGuestReadLoginRequiredPostTypes(),
    getForbiddenKeywords(),
    getNewUserSafetyPolicy(),
    getGuestPostPolicy(),
  ]);

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">운영 관리</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            열람/콘텐츠 정책
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            비회원 열람 범위와 금칙어 정책을 조정합니다.
          </p>
        </header>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">현재 로그인 필수 카테고리</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {loginRequiredTypes.length > 0 ? (
              loginRequiredTypes.map((type) => (
                <span
                  key={type}
                  className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]"
                >
                  {postTypeMeta[type].label} ({type})
                </span>
              ))
            ) : (
              <span className="text-[#5a7398]">현재 비회원 제한 카테고리가 없습니다.</span>
            )}
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">정책 편집</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            체크된 카테고리는 비회원이 열람할 수 없으며 로그인 후 접근 가능합니다.
          </p>
          <div className="mt-4">
            <GuestReadPolicyForm
              initialLoginRequiredTypes={loginRequiredTypes}
            />
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">금칙어 정책</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            금칙어가 포함된 게시글/댓글은 저장이 차단됩니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {forbiddenKeywords.length > 0 ? (
              forbiddenKeywords.slice(0, 20).map((keyword) => (
                <span
                  key={keyword}
                  className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-[#5a7398]">현재 등록된 금칙어가 없습니다.</span>
            )}
            {forbiddenKeywords.length > 20 ? (
              <span className="text-[#5a7398]">
                외 {forbiddenKeywords.length - 20}개
              </span>
            ) : null}
          </div>
          <div className="mt-4">
            <ForbiddenKeywordPolicyForm initialKeywords={forbiddenKeywords} />
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">비회원 작성 정책</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            비회원 즉시 공개 글의 작성 범위/카테고리/링크/연락처/이미지 제한을 조정합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              차단 카테고리 {guestPostPolicy.blockedPostTypes.length}개
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              이미지 최대 {guestPostPolicy.maxImageCount}장
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              범위 {guestPostPolicy.enforceGlobalScope ? "온동네만" : "동네/온동네"}
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              링크 {guestPostPolicy.allowLinks ? "허용" : "차단"}
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              연락처 {guestPostPolicy.allowContact ? "허용" : "차단"}
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              글 제한 {guestPostPolicy.postRateLimit10m}/{guestPostPolicy.postRateLimit1h}/{guestPostPolicy.postRateLimit24h}
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              제재 임계치 {guestPostPolicy.banThreshold24h}/{guestPostPolicy.banThreshold7dMedium}/{guestPostPolicy.banThreshold7dHigh}
            </span>
          </div>
          <div className="mt-4">
            <GuestPostPolicyForm initialPolicy={guestPostPolicy} />
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">신규 계정 안전 정책</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            신규 유저의 고위험 카테고리 작성 제한과 연락처 포함 콘텐츠 차단 시간을
            운영에서 조정할 수 있습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              카테고리 제한: 가입 후 {newUserSafetyPolicy.minAccountAgeHours}시간
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              연락처 차단: 가입 후 {newUserSafetyPolicy.contactBlockWindowHours}시간
            </span>
            <span className="border border-[#bfd0ec] bg-[#f6f9ff] px-2.5 py-1 text-[#315484]">
              제한 카테고리 {newUserSafetyPolicy.restrictedPostTypes.length}개
            </span>
          </div>
          <div className="mt-4">
            <NewUserSafetyPolicyForm
              initialPolicy={newUserSafetyPolicy}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5a7398]">
          <Link href="/admin/reports">신고 큐</Link>
          <Link href="/admin/auth-audits">인증 로그</Link>
          <Link href="/feed">피드로 이동</Link>
        </div>
      </main>
    </div>
  );
}
