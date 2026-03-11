"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  muteUserAction,
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
  const [isMutedByMe, setIsMutedByMe] = useState(initialState.isMutedByMe);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    "rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const runAction = (action: "MUTE" | "UNMUTE") => {
    startTransition(async () => {
      setMessage(null);
      const payload = { targetUserId };
      const result = action === "MUTE" ? await muteUserAction(payload) : await unmuteUserAction(payload);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setIsMutedByMe(result.state.isMutedByMe);
      setMessage(
        action === "MUTE" ? "사용자를 뮤트했습니다." : "뮤트를 해제했습니다.",
      );
      router.refresh();
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-[11px]" : "text-xs"}`}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => runAction(isMutedByMe ? "UNMUTE" : "MUTE")}
        className={`${buttonClass} ${
          isMutedByMe
            ? "border-[#5a7398] bg-[#5a7398] text-white hover:bg-[#4f678d]"
            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
        }`}
      >
        {isMutedByMe ? "뮤트 해제" : "뮤트"}
      </button>
      {initialState.hasBlockedMe ? (
        <span className="text-[11px] text-rose-700">상대가 나를 차단한 상태입니다.</span>
      ) : null}
      {message ? <span className="text-[11px] text-[#4f678d]">{message}</span> : null}
    </div>
  );
}
