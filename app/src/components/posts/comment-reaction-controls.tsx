"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { ReactionLoginPrompt } from "@/components/posts/reaction-login-prompt";
import { subscribeViewerShellSync } from "@/lib/viewer-shell-sync";
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
  className?: string;
  loginHintAlign?: "start" | "end";
};

type CommentReactionAvailabilityInput = {
  currentUserId?: string | null;
  canInteract: boolean;
  isCommentActive: boolean;
};

export function canUseCommentReaction({
  currentUserId,
  canInteract,
  isCommentActive,
}: CommentReactionAvailabilityInput) {
  return Boolean(currentUserId) && canInteract && isCommentActive;
}

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
  className,
  loginHintAlign = "start",
}: CommentReactionControlsProps) {
  const initialLikeCount = Number.isFinite(likeCount) ? Number(likeCount) : 0;
  const initialDislikeCount = Number.isFinite(dislikeCount) ? Number(dislikeCount) : 0;

  const [reaction, setReaction] = useState<ReactionType | null>(currentReaction);
  const [likes, setLikes] = useState(initialLikeCount);
  const [dislikes, setDislikes] = useState(initialDislikeCount);
  const [loginIntent, setLoginIntent] = useState<ReactionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const actionLockRef = useRef(false);

  useEffect(() => {
    setReaction(currentReaction);
  }, [commentId, currentReaction]);

  useEffect(() => {
    setLikes(initialLikeCount);
    setDislikes(initialDislikeCount);
  }, [commentId, initialDislikeCount, initialLikeCount]);

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

  const buttonClass = compact
    ? "inline-flex h-5 items-center gap-1 rounded-md px-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex h-5 items-center justify-center px-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const effectiveCanReact = canReact && !authBlocked;
  const promptAlign = loginHintAlign === "end" ? "end" : loginHintAlign === "start" ? "start" : "center";
  const loginPromptMessage = "좋아요/싫어요는 로그인 후 이용할 수 있어요.";

  const handleToggle = (target: ReactionType) => {
    if (actionLockRef.current) {
      return;
    }

    if (!effectiveCanReact) {
      setLoginIntent(target);
      return;
    }

    const previous = { reaction, likes, dislikes };
    const optimistic = getNextState(reaction, target, likes, dislikes);
    actionLockRef.current = true;

    setError(null);
    setLoginIntent(null);
    setReaction(optimistic.reaction);
    setLikes(optimistic.likeCount);
    setDislikes(optimistic.dislikeCount);

    startTransition(async () => {
      try {
        const result = await toggleCommentReactionAction(postId, commentId, optimistic.reaction);
        if (!result.ok) {
          setReaction(previous.reaction);
          setLikes(previous.likes);
          setDislikes(previous.dislikes);
          if (result.code === "AUTH_REQUIRED") {
            setLoginIntent(target);
          }
          setError(result.message);
          return;
        }

        setReaction(result.reaction);
        setLikes(result.likeCount);
        setDislikes(result.dislikeCount);
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-[#54739e] ${className ?? ""}`.trim()}>
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.LIKE)}
          disabled={isPending}
          aria-disabled={!effectiveCanReact || isPending}
          aria-label={`좋아요 ${likes.toLocaleString()}`}
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
        {!hideLoginHint ? (
          <ReactionLoginPrompt
            isOpen={!effectiveCanReact && loginIntent === REACTION_TYPE.LIKE}
            message={loginPromptMessage}
            loginHref={loginHref}
            align={promptAlign}
            onClose={() => setLoginIntent(null)}
          />
        ) : null}
      </div>

      {showDislike ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => handleToggle(REACTION_TYPE.DISLIKE)}
            disabled={isPending}
            aria-disabled={!effectiveCanReact || isPending}
            aria-label={`싫어요 ${dislikes.toLocaleString()}`}
            className={`${buttonClass} ${
              reaction === REACTION_TYPE.DISLIKE
                ? "text-[#4a5f83]"
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
                  <path d="M12 12v3.2A2.8 2.8 0 0 1 9.2 18l-.5-3.1c-.2-1 .1-2 .7-2.8l.6-.7H5.6A2.6 2.6 0 0 1 3 8.8l.8-4.6A2.6 2.6 0 0 1 6.4 2H12z" />
                  <path d="M17 12h-3V2h3z" />
                </svg>
                <span>{dislikes.toLocaleString()}</span>
              </>
            ) : (
              `비추천 ${dislikes.toLocaleString()}`
            )}
          </button>
          {!hideLoginHint ? (
            <ReactionLoginPrompt
              isOpen={!effectiveCanReact && loginIntent === REACTION_TYPE.DISLIKE}
              message={loginPromptMessage}
              loginHref={loginHref}
              align={promptAlign}
              onClose={() => setLoginIntent(null)}
            />
          ) : null}
        </div>
      ) : null}
      {error ? <span className="w-full text-[11px] text-rose-600">{error}</span> : null}
    </div>
  );
}
