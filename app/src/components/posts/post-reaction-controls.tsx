"use client";

import { PostReactionType } from "@prisma/client";
import { useState, useTransition } from "react";

import { togglePostReactionAction } from "@/server/actions/post";

type PostReactionControlsProps = {
  postId: string;
  likeCount?: number | null;
  dislikeCount?: number | null;
  currentReaction: PostReactionType | null;
  compact?: boolean;
};

function getNextState(
  current: PostReactionType | null,
  target: PostReactionType,
  likeCount: number,
  dislikeCount: number,
) {
  if (current === target) {
    if (target === PostReactionType.LIKE) {
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

  if (target === PostReactionType.LIKE) {
    return {
      reaction: PostReactionType.LIKE,
      likeCount: likeCount + 1,
      dislikeCount:
        current === PostReactionType.DISLIKE
          ? Math.max(0, dislikeCount - 1)
          : dislikeCount,
    };
  }

  return {
    reaction: PostReactionType.DISLIKE,
    likeCount:
      current === PostReactionType.LIKE ? Math.max(0, likeCount - 1) : likeCount,
    dislikeCount: dislikeCount + 1,
  };
}

export function PostReactionControls({
  postId,
  likeCount,
  dislikeCount,
  currentReaction,
  compact = false,
}: PostReactionControlsProps) {
  const initialLikeCount = Number.isFinite(likeCount) ? Number(likeCount) : 0;
  const initialDislikeCount = Number.isFinite(dislikeCount) ? Number(dislikeCount) : 0;

  const [reaction, setReaction] = useState<PostReactionType | null>(currentReaction);
  const [likes, setLikes] = useState(initialLikeCount);
  const [dislikes, setDislikes] = useState(initialDislikeCount);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buttonClass =
    "inline-flex items-center justify-center border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const handleToggle = (target: PostReactionType) => {
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
        onClick={() => handleToggle(PostReactionType.LIKE)}
        disabled={isPending}
        className={`${buttonClass} ${
          reaction === PostReactionType.LIKE
            ? "border-[#3567b5] bg-[#3567b5] text-white"
            : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
        }`}
      >
        좋아요 {likes.toLocaleString()}
      </button>
      <button
        type="button"
        onClick={() => handleToggle(PostReactionType.DISLIKE)}
        disabled={isPending}
        className={`${buttonClass} ${
          reaction === PostReactionType.DISLIKE
            ? "border-[#5e7396] bg-[#5e7396] text-white"
            : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
        }`}
      >
        싫어요 {dislikes.toLocaleString()}
      </button>
      {!compact && error ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : null}
      {compact && error ? (
        <span className="w-full text-[11px] text-rose-600">{error}</span>
      ) : null}
    </div>
  );
}
