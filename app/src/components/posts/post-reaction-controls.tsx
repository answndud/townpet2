"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { togglePostReactionAction } from "@/server/actions/post";

const REACTION_TYPE = {
  LIKE: "LIKE",
  DISLIKE: "DISLIKE",
} as const;

type ReactionType = (typeof REACTION_TYPE)[keyof typeof REACTION_TYPE];

type PostReactionControlsProps = {
  postId: string;
  likeCount?: number | null;
  dislikeCount?: number | null;
  currentReaction: ReactionType | null;
  compact?: boolean;
  canReact?: boolean;
  loginHref?: string;
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

export function PostReactionControls({
  postId,
  likeCount,
  dislikeCount,
  currentReaction,
  compact = false,
  canReact = true,
  loginHref = "/login",
}: PostReactionControlsProps) {
  const initialLikeCount = Number.isFinite(likeCount) ? Number(likeCount) : 0;
  const initialDislikeCount = Number.isFinite(dislikeCount) ? Number(dislikeCount) : 0;

  const [reaction, setReaction] = useState<ReactionType | null>(currentReaction);
  const [likes, setLikes] = useState(initialLikeCount);
  const [dislikes, setDislikes] = useState(initialDislikeCount);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    "inline-flex items-center justify-center border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const handleToggle = (target: ReactionType) => {
    if (!canReact) {
      return;
    }

    const previous = { reaction, likes, dislikes };
    const optimistic = getNextState(reaction, target, likes, dislikes);

    setError(null);
    setReaction(optimistic.reaction);
    setLikes(optimistic.likeCount);
    setDislikes(optimistic.dislikeCount);

    startTransition(async () => {
      const result = await togglePostReactionAction(postId, target);
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
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => handleToggle(REACTION_TYPE.LIKE)}
        disabled={isPending || !canReact}
        className={`${buttonClass} ${
          reaction === REACTION_TYPE.LIKE
            ? "border-[#3567b5] bg-[#3567b5] text-white"
            : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
        }`}
      >
        좋아요 {likes.toLocaleString()}
      </button>
      <button
        type="button"
        onClick={() => handleToggle(REACTION_TYPE.DISLIKE)}
        disabled={isPending || !canReact}
        className={`${buttonClass} ${
          reaction === REACTION_TYPE.DISLIKE
            ? "border-[#5e7396] bg-[#5e7396] text-white"
            : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
        }`}
      >
        싫어요 {dislikes.toLocaleString()}
      </button>
      {!canReact && !compact ? (
        <Link href={loginHref} className="text-xs text-[#2f5da4] underline underline-offset-2">
          로그인 후 반응 가능
        </Link>
      ) : null}
      {!canReact && compact ? (
        <Link href={loginHref} className="w-full text-[11px] text-[#2f5da4] underline underline-offset-2">
          로그인 후 반응 가능
        </Link>
      ) : null}
      {!compact && error ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : null}
      {compact && error ? (
        <span className="w-full text-[11px] text-rose-600">{error}</span>
      ) : null}
    </div>
  );
}
