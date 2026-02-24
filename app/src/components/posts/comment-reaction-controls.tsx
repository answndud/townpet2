"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

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
}: CommentReactionControlsProps) {
  const initialLikeCount = Number.isFinite(likeCount) ? Number(likeCount) : 0;
  const initialDislikeCount = Number.isFinite(dislikeCount) ? Number(dislikeCount) : 0;

  const [reaction, setReaction] = useState<ReactionType | null>(currentReaction);
  const [likes, setLikes] = useState(initialLikeCount);
  const [dislikes, setDislikes] = useState(initialDislikeCount);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    "inline-flex h-5 items-center justify-center px-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

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
      <button
        type="button"
        onClick={() => handleToggle(REACTION_TYPE.LIKE)}
        disabled={isPending || !canReact}
        className={`${buttonClass} ${
          reaction === REACTION_TYPE.LIKE
            ? "text-[#1f4f94]"
            : "text-[#4f6f9a] hover:text-[#315484]"
        }`}
      >
        추천 {likes.toLocaleString()}
      </button>
      <button
        type="button"
        onClick={() => handleToggle(REACTION_TYPE.DISLIKE)}
        disabled={isPending || !canReact}
        className={`${buttonClass} ${
          reaction === REACTION_TYPE.DISLIKE
            ? "text-[#4a5f83]"
            : "text-[#4f6f9a] hover:text-[#315484]"
        }`}
      >
        비추천 {dislikes.toLocaleString()}
      </button>
      {!canReact ? (
        <Link href={loginHref} className="text-[11px] text-[#2f5da4] underline underline-offset-2">
          로그인 후 반응 가능
        </Link>
      ) : null}
      {error ? <span className="w-full text-[11px] text-rose-600">{error}</span> : null}
    </div>
  );
}
