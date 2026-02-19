"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  blockUserAction,
  muteUserAction,
  unblockUserAction,
  unmuteUserAction,
} from "@/server/actions/user-relation";

type UserRelationControlsProps = {
  targetUserId: string;
  initialState: {
    isBlockedByMe: boolean;
    hasBlockedMe: boolean;
    isMutedByMe: boolean;
  };
  compact?: boolean;
};

export function UserRelationControls({
  targetUserId,
  initialState,
  compact = false,
}: UserRelationControlsProps) {
  const router = useRouter();
  const [isBlockedByMe, setIsBlockedByMe] = useState(initialState.isBlockedByMe);
  const [hasBlockedMe] = useState(initialState.hasBlockedMe);
  const [isMutedByMe, setIsMutedByMe] = useState(initialState.isMutedByMe);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    "border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const runAction = (action: "BLOCK" | "UNBLOCK" | "MUTE" | "UNMUTE") => {
    startTransition(async () => {
      setMessage(null);
      const payload = { targetUserId };
      const result =
        action === "BLOCK"
          ? await blockUserAction(payload)
          : action === "UNBLOCK"
            ? await unblockUserAction(payload)
            : action === "MUTE"
              ? await muteUserAction(payload)
              : await unmuteUserAction(payload);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setIsBlockedByMe(result.state.isBlockedByMe);
      setIsMutedByMe(result.state.isMutedByMe);
      setMessage(
        action === "BLOCK"
          ? "사용자를 차단했습니다."
          : action === "UNBLOCK"
            ? "차단을 해제했습니다."
            : action === "MUTE"
            ? "사용자를 뮤트했습니다."
            : "뮤트를 해제했습니다.",
      );
      router.refresh();
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-[11px]" : "text-xs"}`}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => runAction(isBlockedByMe ? "UNBLOCK" : "BLOCK")}
        className={`${buttonClass} ${
          isBlockedByMe
            ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
        }`}
      >
        {isBlockedByMe ? "차단 해제" : "차단"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => runAction(isMutedByMe ? "UNMUTE" : "MUTE")}
        className={`${buttonClass} ${
          isMutedByMe
            ? "border-[#5a7398] bg-[#5a7398] text-white hover:bg-[#4f678d]"
            : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
        }`}
      >
        {isMutedByMe ? "뮤트 해제" : "뮤트"}
      </button>
      {hasBlockedMe ? (
        <span className="text-[11px] text-rose-700">상대가 나를 차단한 상태입니다.</span>
      ) : null}
      {message ? <span className="text-[11px] text-[#4f678d]">{message}</span> : null}
    </div>
  );
}
