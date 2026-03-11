"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { ReactionLoginPrompt } from "@/components/posts/reaction-login-prompt";
import { subscribeViewerShellSync } from "@/lib/viewer-shell-sync";
import {
  calculatePostReactionScore,
  getPostReactionScoreMagnitude,
  getPostReactionScoreTone,
} from "@/lib/post-reaction-score";
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
  currentReaction?: ReactionType | null;
  compact?: boolean;
  canReact?: boolean;
  loginHref?: string;
  showLoginHint?: boolean;
  onStateChange?: (nextState: {
    reaction: ReactionType | null;
    likeCount: number;
    dislikeCount: number;
  }) => void;
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
  showLoginHint = true,
  onStateChange,
}: PostReactionControlsProps) {
  const initialLikeCount =
    Number.isFinite(likeCount) && Number(likeCount) > 0 ? Math.trunc(Number(likeCount)) : 0;
  const initialDislikeCount =
    Number.isFinite(dislikeCount) && Number(dislikeCount) > 0
      ? Math.trunc(Number(dislikeCount))
      : 0;

  const [reaction, setReaction] = useState<ReactionType | null>(currentReaction ?? null);
  const [reactionLoaded, setReactionLoaded] = useState(currentReaction !== undefined);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [likes, setLikes] = useState(initialLikeCount);
  const [dislikes, setDislikes] = useState(initialDislikeCount);
  const [loginIntent, setLoginIntent] = useState<ReactionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const actionLockRef = useRef(false);

  useEffect(() => {
    setLikes(initialLikeCount);
    setDislikes(initialDislikeCount);
  }, [initialDislikeCount, initialLikeCount]);

  useEffect(() => {
    if (currentReaction === undefined) {
      return;
    }

    setReaction(currentReaction);
    setReactionLoaded(true);
    setHasInteracted(false);
  }, [currentReaction]);

  useEffect(() => {
    setHasInteracted(false);
    setError(null);
    setLoginIntent(null);
    if (currentReaction !== undefined) {
      setReaction(currentReaction);
      setReactionLoaded(true);
      return;
    }

    setReaction(null);
    setReactionLoaded(false);
  }, [currentReaction, postId]);

  useEffect(() => {
    if (!loginIntent) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoginIntent(null);
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loginIntent]);

  useEffect(
    () =>
      subscribeViewerShellSync((payload) => {
        if (payload.reason === "auth-logout") {
          setAuthBlocked(true);
          return;
        }

        if (payload.reason === "auth-login") {
          setAuthBlocked(false);
        }
      }),
    [],
  );

  const effectiveReaction = hasInteracted ? reaction : (currentReaction ?? reaction);
  const effectiveCanReact = canReact && !authBlocked;
  const loginPromptMessage = "좋아요/싫어요는 로그인 후 이용할 수 있어요.";

  useEffect(() => {
    if (!effectiveCanReact || reactionLoaded) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/reaction`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          ok: boolean;
          data?: { reaction: ReactionType | null };
        };
        if (!payload.ok || cancelled || hasInteracted) {
          return;
        }
        setReaction(payload.data?.reaction ?? null);
        setReactionLoaded(true);
      } catch {
        if (!cancelled) {
          setReactionLoaded(true);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [effectiveCanReact, hasInteracted, postId, reactionLoaded]);

  const buttonClass = compact
    ? "inline-flex tp-btn-xs min-w-[60px] items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex tp-btn-sm min-w-[76px] items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60";
  const reactionScore = calculatePostReactionScore(likes, dislikes);
  const reactionScoreMagnitude = getPostReactionScoreMagnitude(reactionScore);
  const reactionScoreTone = getPostReactionScoreTone(reactionScore);
  const reactionScoreDirectionLabel =
    reactionScore > 0 ? "좋아요 우세" : reactionScore < 0 ? "싫어요 우세" : "반응 균형";
  const reactionScoreClass =
    reactionScoreTone === "positiveStrong"
      ? "border-[#739de7] bg-[#e1edff] text-[#184f9c]"
      : reactionScoreTone === "positive"
        ? "border-[#a5c1ee] bg-[#eef5ff] text-[#275ea8]"
        : reactionScoreTone === "positiveSoft"
          ? "border-[#cbdcf7] bg-[#f5f9ff] text-[#3567b5]"
          : reactionScoreTone === "negativeStrong"
            ? "border-[#e47e93] bg-[#ffe7eb] text-[#b52639]"
            : reactionScoreTone === "negative"
              ? "border-[#ec9dad] bg-[#fff0f2] text-[#c73b4d]"
              : reactionScoreTone === "negativeSoft"
                ? "border-[#f3cbd2] bg-[#fff6f7] text-[#d14a5b]"
                : "border-[#d8e4f6] bg-white text-[#5d7499]";

  const handleToggle = (target: ReactionType) => {
    if (actionLockRef.current) {
      return;
    }

    if (!effectiveCanReact) {
      setLoginIntent(target);
      return;
    }

    setHasInteracted(true);

    const previous = {
      reaction: effectiveReaction,
      likeCount: likes,
      dislikeCount: dislikes,
    };
    const optimistic = getNextState(effectiveReaction, target, likes, dislikes);
    actionLockRef.current = true;

    setError(null);
    setLoginIntent(null);
    setReaction(optimistic.reaction);
    setLikes(optimistic.likeCount);
    setDislikes(optimistic.dislikeCount);
    onStateChange?.(optimistic);

    startTransition(async () => {
      try {
        const result = await togglePostReactionAction(postId, optimistic.reaction);
        if (!result.ok) {
          setReaction(previous.reaction);
          setLikes(previous.likeCount);
          setDislikes(previous.dislikeCount);
          if (result.code === "AUTH_REQUIRED") {
            setAuthBlocked(true);
            setLoginIntent(target);
          }
          setError(result.message);
          onStateChange?.(previous);
          return;
        }

        setReaction(result.reaction);
        setLikes(result.likeCount);
        setDislikes(result.dislikeCount);
        onStateChange?.({
          reaction: result.reaction,
          likeCount: result.likeCount,
          dislikeCount: result.dislikeCount,
        });
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "justify-end" : "justify-center"}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.LIKE)}
          disabled={isPending}
          aria-disabled={!effectiveCanReact || isPending}
          aria-label={`좋아요 ${likes.toLocaleString()}개`}
          title={`좋아요 ${likes.toLocaleString()}개`}
          className={`${buttonClass} ${
            effectiveReaction === REACTION_TYPE.LIKE
              ? "border-[#3567b5] bg-[#f5f9ff] text-[#2d5fab]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          좋아요
        </button>
        {!effectiveCanReact && showLoginHint && loginIntent === REACTION_TYPE.LIKE ? (
          <ReactionLoginPrompt
            isOpen
            message={loginPromptMessage}
            loginHref={loginHref}
            align="center"
            onClose={() => setLoginIntent(null)}
          />
        ) : null}
      </div>
      <div
        aria-label={`${reactionScoreDirectionLabel} ${reactionScoreMagnitude.toLocaleString()}`}
        title={`좋아요 ${likes.toLocaleString()}개, 싫어요 ${dislikes.toLocaleString()}개`}
        className={`inline-flex min-w-[64px] items-center justify-center rounded-lg border px-2.5 py-1 text-[15px] font-semibold leading-none tabular-nums ${reactionScoreClass} ${
          compact ? "min-h-[1.875rem] text-xs" : "min-h-[2rem]"
        }`}
      >
        {reactionScoreMagnitude.toLocaleString()}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.DISLIKE)}
          disabled={isPending}
          aria-disabled={!effectiveCanReact || isPending}
          aria-label={`싫어요 ${dislikes.toLocaleString()}개`}
          title={`싫어요 ${dislikes.toLocaleString()}개`}
          className={`${buttonClass} ${
            effectiveReaction === REACTION_TYPE.DISLIKE
              ? "border-[#d94b60] bg-[#fff7f8] text-[#d83b52]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          싫어요
        </button>
        {!effectiveCanReact && showLoginHint && loginIntent === REACTION_TYPE.DISLIKE ? (
          <ReactionLoginPrompt
            isOpen
            message={loginPromptMessage}
            loginHref={loginHref}
            align="center"
            onClose={() => setLoginIntent(null)}
          />
        ) : null}
      </div>
      {!compact && error ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : null}
      {compact && error ? (
        <span className="w-full text-[11px] text-rose-600">{error}</span>
      ) : null}
    </div>
  );
}
