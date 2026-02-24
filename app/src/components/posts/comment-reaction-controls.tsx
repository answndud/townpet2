"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { toggleCommentReactionAction } from "@/server/actions/comment";

const REACTION_TYPE = {
  LIKE: "LIKE",
  DISLIKE: "DISLIKE",
} as const;

type ReactionType = (typeof REACTION_TYPE)[keyof typeof REACTION_TYPE];

type CommentReactionControlsProps = {
  postId: string;
  commentId: string;
  likeCount?: number | null;
  dislikeCount?: number | null;
  currentReaction: ReactionType | null;
  canReact?: boolean;
  loginHref?: string;
  compact?: boolean;
  showDislike?: boolean;
  hideLoginHint?: boolean;
};

function getNextState(
  current: ReactionType | null,
  target: ReactionType,
  likeCount: number,
  dislikeCount: number,
) {
  if (current === target) {
    if (target === REACTION_TYPE.LIKE) {
      return {
        reaction: null,
        likeCount: Math.max(0, likeCount - 1),
        dislikeCount,
      };
    }

    return {
      reaction: null,
      likeCount,
      dislikeCount: Math.max(0, dislikeCount - 1),
    };
  }

  if (target === REACTION_TYPE.LIKE) {
    return {
      reaction: REACTION_TYPE.LIKE,
      likeCount: likeCount + 1,
      dislikeCount:
        current === REACTION_TYPE.DISLIKE
          ? Math.max(0, dislikeCount - 1)
          : dislikeCount,
    };
  }

  return {
    reaction: REACTION_TYPE.DISLIKE,
    likeCount:
      current === REACTION_TYPE.LIKE ? Math.max(0, likeCount - 1) : likeCount,
    dislikeCount: dislikeCount + 1,
  };
}

export function CommentReactionControls({
  postId,
  commentId,
  likeCount,
  dislikeCount,
  currentReaction,
  canReact = true,
  loginHref = "/login",
  compact = false,
  showDislike = true,
  hideLoginHint = false,
}: CommentReactionControlsProps) {
  const initialLikeCount = Number.isFinite(likeCount) ? Number(likeCount) : 0;
  const initialDislikeCount = Number.isFinite(dislikeCount) ? Number(dislikeCount) : 0;

  const [reaction, setReaction] = useState<ReactionType | null>(currentReaction);
  const [likes, setLikes] = useState(initialLikeCount);
  const [dislikes, setDislikes] = useState(initialDislikeCount);
  const [loginIntent, setLoginIntent] = useState<ReactionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!loginIntent) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoginIntent(null);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loginIntent]);

  const buttonClass = compact
    ? "inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex h-5 items-center justify-center px-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const handleToggle = (target: ReactionType) => {
    if (!canReact) {
      setLoginIntent(target);
      return;
    }

    const previous = { reaction, likes, dislikes };
    const optimistic = getNextState(reaction, target, likes, dislikes);

    setError(null);
    setLoginIntent(null);
    setReaction(optimistic.reaction);
    setLikes(optimistic.likeCount);
    setDislikes(optimistic.dislikeCount);

    startTransition(async () => {
      const result = await toggleCommentReactionAction(postId, commentId, target);
      if (!result.ok) {
        setReaction(previous.reaction);
        setLikes(previous.likes);
        setDislikes(previous.dislikes);
        setError(result.message);
        return;
      }

      setReaction(result.reaction);
      setLikes(result.likeCount);
      setDislikes(result.dislikeCount);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 text-[#54739e]">
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.LIKE)}
          disabled={isPending}
          className={`${buttonClass} ${
            reaction === REACTION_TYPE.LIKE
              ? "text-[#1f4f94]"
              : "text-[#4f6f9a] hover:text-[#315484]"
          }`}
        >
          {compact ? (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M8 8V4.8A2.8 2.8 0 0 1 10.8 2l.5 3.1c.2 1-.1 2-.7 2.8L10 8.6h4.4A2.6 2.6 0 0 1 17 11.2l-.8 4.6a2.6 2.6 0 0 1-2.6 2.2H8z" />
                <path d="M3 8h3v10H3z" />
              </svg>
              <span>{likes.toLocaleString()}</span>
            </>
          ) : (
            <>추천 {likes.toLocaleString()}</>
          )}
        </button>
        {!canReact && !hideLoginHint && loginIntent === REACTION_TYPE.LIKE ? (
          <div className="absolute left-0 top-[calc(100%+6px)] z-10 max-w-[min(82vw,230px)] rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 text-[11px] text-[#355988] shadow-[0_8px_18px_rgba(16,40,74,0.12)]">
            로그인 후 반응 가능. {" "}
            <Link href={loginHref} className="font-semibold text-[#2f5da4] underline underline-offset-2">
              로그인하기
            </Link>
          </div>
        ) : null}
      </div>

      {showDislike ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => handleToggle(REACTION_TYPE.DISLIKE)}
            disabled={isPending}
            className={`${buttonClass} ${
              reaction === REACTION_TYPE.DISLIKE
                ? "text-[#4a5f83]"
                : "text-[#4f6f9a] hover:text-[#315484]"
            }`}
          >
            {compact ? dislikes.toLocaleString() : `비추천 ${dislikes.toLocaleString()}`}
          </button>
          {!canReact && !hideLoginHint && loginIntent === REACTION_TYPE.DISLIKE ? (
            <div className="absolute left-0 top-[calc(100%+6px)] z-10 max-w-[min(82vw,230px)] rounded-sm border border-[#bfd0ec] bg-white px-2 py-1 text-[11px] text-[#355988] shadow-[0_8px_18px_rgba(16,40,74,0.12)]">
              로그인 후 반응 가능. {" "}
              <Link href={loginHref} className="font-semibold text-[#2f5da4] underline underline-offset-2">
                로그인하기
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <span className="w-full text-[11px] text-rose-600">{error}</span> : null}
    </div>
  );
}
