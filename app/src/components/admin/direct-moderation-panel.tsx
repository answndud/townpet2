"use client";

import { UserRole } from "@prisma/client";
import { useState, useTransition } from "react";

type DirectModerationTargetUser = {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
};

type DirectSanctionResponse = {
  targetUser: DirectModerationTargetUser;
  sanctionLevel: string;
  sanctionLabel: string;
};

type DirectHideResponse = {
  targetUser: DirectModerationTargetUser;
  scope: "LAST_24H" | "LAST_7D" | "ALL_ACTIVE";
  scopeLabel: string;
  hiddenPostCount: number;
  hiddenCommentCount: number;
};

type DirectRestoreResponse = {
  targetUser: DirectModerationTargetUser;
  scope: "LAST_24H" | "LAST_7D" | "ALL_ACTIVE";
  scopeLabel: string;
  restoredPostCount: number;
  restoredCommentCount: number;
};

const CONTENT_SCOPE_OPTIONS = [
  { value: "LAST_24H", label: "최근 24시간" },
  { value: "LAST_7D", label: "최근 7일" },
  { value: "ALL_ACTIVE", label: "전체 범위" },
] as const;

function getTargetUserLabel(user: DirectModerationTargetUser) {
  return user.nickname ? `${user.nickname} (${user.email})` : user.email;
}

async function parseResponsePayload<T>(response: Response) {
  const payload = (await response.json()) as
    | { ok: true; data: T }
    | { ok: false; error?: { message?: string } };

  if (!response.ok || !payload.ok) {
    return {
      ok: false as const,
      message: payload.ok ? "처리에 실패했습니다." : payload.error?.message ?? "처리에 실패했습니다.",
    };
  }

  return {
    ok: true as const,
    data: payload.data,
  };
}

export function DirectModerationPanel() {
  const [sanctionUserKey, setSanctionUserKey] = useState("");
  const [sanctionReason, setSanctionReason] = useState("");
  const [sanctionMessage, setSanctionMessage] = useState<string | null>(null);
  const [sanctionError, setSanctionError] = useState<string | null>(null);
  const [isSanctionPending, startSanctionTransition] = useTransition();

  const [hideUserKey, setHideUserKey] = useState("");
  const [hideReason, setHideReason] = useState("");
  const [hideScope, setHideScope] = useState<(typeof CONTENT_SCOPE_OPTIONS)[number]["value"]>(
    "LAST_24H",
  );
  const [hideMessage, setHideMessage] = useState<string | null>(null);
  const [hideError, setHideError] = useState<string | null>(null);
  const [isHidePending, startHideTransition] = useTransition();

  const [restoreUserKey, setRestoreUserKey] = useState("");
  const [restoreReason, setRestoreReason] = useState("");
  const [restoreScope, setRestoreScope] = useState<
    (typeof CONTENT_SCOPE_OPTIONS)[number]["value"]
  >("ALL_ACTIVE");
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestorePending, startRestoreTransition] = useTransition();

  const handleDirectSanction = () => {
    setSanctionMessage(null);
    setSanctionError(null);

    startSanctionTransition(async () => {
      const response = await fetch("/api/admin/moderation/users/sanction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userKey: sanctionUserKey,
          reason: sanctionReason,
        }),
      });

      const payload = await parseResponsePayload<DirectSanctionResponse>(response);
      if (!payload.ok) {
        setSanctionError(payload.message);
        return;
      }

      setSanctionMessage(
        `${getTargetUserLabel(payload.data.targetUser)} 계정을 ${payload.data.sanctionLabel} 처리했습니다.`,
      );
      setSanctionUserKey("");
      setSanctionReason("");
    });
  };

  const handleHideContent = () => {
    setHideMessage(null);
    setHideError(null);

    startHideTransition(async () => {
      const response = await fetch("/api/admin/moderation/users/hide-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userKey: hideUserKey,
          reason: hideReason,
          scope: hideScope,
        }),
      });

      const payload = await parseResponsePayload<DirectHideResponse>(response);
      if (!payload.ok) {
        setHideError(payload.message);
        return;
      }

      const summary =
        payload.data.hiddenPostCount === 0 && payload.data.hiddenCommentCount === 0
          ? `${getTargetUserLabel(payload.data.targetUser)} 사용자의 ${payload.data.scopeLabel} 범위에 숨길 ACTIVE 글/댓글이 없습니다.`
          : `${getTargetUserLabel(payload.data.targetUser)} 사용자의 ${payload.data.scopeLabel} 범위에서 게시글 ${payload.data.hiddenPostCount}건, 댓글 ${payload.data.hiddenCommentCount}건을 숨겼습니다.`;

      setHideMessage(summary);
      setHideUserKey("");
      setHideReason("");
      setHideScope("LAST_24H");
    });
  };

  const handleRestoreContent = () => {
    setRestoreMessage(null);
    setRestoreError(null);

    startRestoreTransition(async () => {
      const response = await fetch("/api/admin/moderation/users/restore-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userKey: restoreUserKey,
          reason: restoreReason,
          scope: restoreScope,
        }),
      });

      const payload = await parseResponsePayload<DirectRestoreResponse>(response);
      if (!payload.ok) {
        setRestoreError(payload.message);
        return;
      }

      const summary =
        payload.data.restoredPostCount === 0 && payload.data.restoredCommentCount === 0
          ? `${getTargetUserLabel(payload.data.targetUser)} 사용자의 ${payload.data.scopeLabel}에서 복구할 직접 숨김 콘텐츠가 없습니다.`
          : `${getTargetUserLabel(payload.data.targetUser)} 사용자의 ${payload.data.scopeLabel}에서 게시글 ${payload.data.restoredPostCount}건, 댓글 ${payload.data.restoredCommentCount}건을 복구했습니다.`;

      setRestoreMessage(summary);
      setRestoreUserKey("");
      setRestoreReason("");
      setRestoreScope("ALL_ACTIVE");
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="tp-card flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">Direct Sanction</p>
          <h2 className="mt-1 text-lg font-semibold text-[#14315f]">신고 없이 단계적 제재</h2>
          <p className="mt-2 text-sm text-[#4f678d]">
            일반 사용자 계정을 바로 경고/정지 단계로 넘깁니다. 운영자 계정이나 자기 자신은
            이 도구로 처리하지 않습니다.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>사용자 ID 또는 이메일</span>
          <input
            value={sanctionUserKey}
            onChange={(event) => setSanctionUserKey(event.target.value)}
            className="tp-input-soft bg-white px-3 py-2 text-sm"
            placeholder="userId 또는 user@example.com"
            disabled={isSanctionPending}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>사유</span>
          <textarea
            value={sanctionReason}
            onChange={(event) => setSanctionReason(event.target.value)}
            className="tp-input-soft min-h-[112px] bg-white px-3 py-2 text-sm"
            placeholder="반복 스팸, 분탕, 다중 계정 링크 도배 등"
            disabled={isSanctionPending}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDirectSanction}
            className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={
              isSanctionPending ||
              sanctionUserKey.trim().length === 0 ||
              sanctionReason.trim().length === 0
            }
          >
            {isSanctionPending ? "처리 중..." : "단계적 제재 적용"}
          </button>
          {sanctionMessage ? (
            <span className="text-xs text-[#355988]">{sanctionMessage}</span>
          ) : null}
          {sanctionError ? <span className="text-xs text-rose-700">{sanctionError}</span> : null}
        </div>
      </section>

      <section className="tp-card flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">Content Hide</p>
          <h2 className="mt-1 text-lg font-semibold text-[#14315f]">사용자 최근 글/댓글 일괄 숨김</h2>
          <p className="mt-2 text-sm text-[#4f678d]">
            같은 사용자의 ACTIVE 게시글과 댓글만 숨깁니다. 매크로 자동화는 먼저 숨김을 적용한
            뒤, 필요할 때만 별도 제재를 호출하는 방식이 안전합니다.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>사용자 ID 또는 이메일</span>
          <input
            value={hideUserKey}
            onChange={(event) => setHideUserKey(event.target.value)}
            className="tp-input-soft bg-white px-3 py-2 text-sm"
            placeholder="userId 또는 user@example.com"
            disabled={isHidePending}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>범위</span>
          <select
            value={hideScope}
            onChange={(event) =>
              setHideScope(event.target.value as (typeof CONTENT_SCOPE_OPTIONS)[number]["value"])
            }
            className="tp-input-soft bg-white px-3 py-2 text-sm"
            disabled={isHidePending}
          >
            {CONTENT_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>사유</span>
          <textarea
            value={hideReason}
            onChange={(event) => setHideReason(event.target.value)}
            className="tp-input-soft min-h-[112px] bg-white px-3 py-2 text-sm"
            placeholder="링크 도배, 같은 문장 반복, 댓글 스팸 등"
            disabled={isHidePending}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleHideContent}
            className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={
              isHidePending ||
              hideUserKey.trim().length === 0 ||
              hideReason.trim().length === 0
            }
          >
            {isHidePending ? "처리 중..." : "콘텐츠 숨김 실행"}
          </button>
          {hideMessage ? <span className="text-xs text-[#355988]">{hideMessage}</span> : null}
          {hideError ? <span className="text-xs text-rose-700">{hideError}</span> : null}
        </div>
      </section>

      <section className="tp-card flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">Content Restore</p>
          <h2 className="mt-1 text-lg font-semibold text-[#14315f]">직접 숨김 콘텐츠 복구</h2>
          <p className="mt-2 text-sm text-[#4f678d]">
            마지막 moderation 상태가 직접 숨김인 대상만 복구합니다. 신고 숨김이나 다른 운영
            조치가 섞인 콘텐츠는 자동 복구하지 않습니다.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>사용자 ID 또는 이메일</span>
          <input
            value={restoreUserKey}
            onChange={(event) => setRestoreUserKey(event.target.value)}
            className="tp-input-soft bg-white px-3 py-2 text-sm"
            placeholder="userId 또는 user@example.com"
            disabled={isRestorePending}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>범위</span>
          <select
            value={restoreScope}
            onChange={(event) =>
              setRestoreScope(
                event.target.value as (typeof CONTENT_SCOPE_OPTIONS)[number]["value"],
              )
            }
            className="tp-input-soft bg-white px-3 py-2 text-sm"
            disabled={isRestorePending}
          >
            {CONTENT_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
          <span>사유</span>
          <textarea
            value={restoreReason}
            onChange={(event) => setRestoreReason(event.target.value)}
            className="tp-input-soft min-h-[112px] bg-white px-3 py-2 text-sm"
            placeholder="오탐, 사람이 확인한 정상 게시글, 잘못된 자동 차단 등"
            disabled={isRestorePending}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRestoreContent}
            className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
            disabled={
              isRestorePending ||
              restoreUserKey.trim().length === 0 ||
              restoreReason.trim().length === 0
            }
          >
            {isRestorePending ? "처리 중..." : "직접 숨김 복구"}
          </button>
          {restoreMessage ? <span className="text-xs text-[#355988]">{restoreMessage}</span> : null}
          {restoreError ? <span className="text-xs text-rose-700">{restoreError}</span> : null}
        </div>
      </section>
    </div>
  );
}
