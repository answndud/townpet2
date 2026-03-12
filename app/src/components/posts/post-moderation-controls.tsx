"use client";

import { PostStatus } from "@prisma/client";
import { useState, useTransition } from "react";

type PostModerationControlsProps = {
  postId: string;
  postTitle: string;
  currentStatus: PostStatus;
  onStatusChange: (nextStatus: PostStatus) => void;
};

type PostVisibilityResponse = {
  changed: boolean;
  action: "HIDE" | "UNHIDE";
  previousStatus: PostStatus;
  post: {
    id: string;
    title: string;
    status: PostStatus;
  };
};

export async function parsePostModerationResponsePayload<T>(response: Response) {
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

export function PostModerationControls({
  postId,
  postTitle,
  currentStatus,
  onStatusChange,
}: PostModerationControlsProps) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const action = currentStatus === PostStatus.HIDDEN ? "UNHIDE" : "HIDE";
  const actionLabel = action === "HIDE" ? "게시글 숨김" : "숨김 해제";
  const helperText =
    action === "HIDE"
      ? "이 게시글만 즉시 숨기고, 별도 사용자 제재는 직접 모더레이션 흐름에서 이어서 처리합니다."
      : "신고 숨김 여부와 무관하게 사람이 확인한 뒤 게시글을 다시 공개 상태로 되돌립니다.";

  const handleSubmit = () => {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/moderation/posts/${postId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason,
        }),
      });

      const payload = await parsePostModerationResponsePayload<PostVisibilityResponse>(response);
      if (!payload.ok) {
        setError(payload.message);
        return;
      }

      onStatusChange(payload.data.post.status);
      setMessage(
        payload.data.changed
          ? action === "HIDE"
            ? `"${postTitle}" 게시글을 숨겼습니다.`
            : `"${postTitle}" 게시글 숨김을 해제했습니다.`
          : action === "HIDE"
            ? `"${postTitle}" 게시글은 이미 숨김 상태입니다.`
            : `"${postTitle}" 게시글은 이미 공개 상태입니다.`,
      );
      setReason("");
    });
  };

  return (
    <section className="tp-card flex flex-col gap-3 p-4 sm:p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">Moderator</p>
        <h2 className="mt-1 text-base font-semibold text-[#14315f]">게시글 직접 숨김/해제</h2>
        <p className="mt-2 text-sm text-[#4f678d]">{helperText}</p>
      </div>

      <label className="flex flex-col gap-1.5 text-xs text-[#355988]">
        <span>사유</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="tp-input-soft min-h-[96px] bg-white px-3 py-2 text-sm"
          placeholder={action === "HIDE" ? "스팸 링크 반복, 분탕 유도 제목 등" : "오탐, 관리자 재검토 완료 등"}
          disabled={isPending}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#d8e4f6] bg-[#f7faff] px-2.5 py-1 text-[11px] font-semibold text-[#426391]">
          현재 상태: {currentStatus === PostStatus.HIDDEN ? "숨김" : "공개"}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          className={`px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
            action === "HIDE"
              ? "tp-btn-soft text-rose-700 hover:bg-rose-50"
              : "tp-btn-primary"
          }`}
          disabled={isPending || reason.trim().length === 0}
        >
          {isPending ? "처리 중..." : actionLabel}
        </button>
        {message ? <span className="text-xs text-[#355988]">{message}</span> : null}
        {error ? <span className="text-xs text-rose-700">{error}</span> : null}
      </div>
    </section>
  );
}
