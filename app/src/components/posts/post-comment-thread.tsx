"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostStatus, ReportTarget } from "@prisma/client";
import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";

import {
  canUseCommentReaction,
  CommentReactionControls,
} from "@/components/posts/comment-reaction-controls";
import { LinkifiedContent } from "@/components/content/linkified-content";
import {
  POST_COMMENT_FORM_FIELD_CLASS_NAME,
  POST_COMMENT_FORM_MUTED_CLASS_NAME,
  POST_COMMENT_FORM_PANEL_CLASS_NAME,
  POST_COMMENT_THREAD_CARD_CLASS_NAME,
} from "@/components/posts/post-comment-layout-class";
import { PostReportForm } from "@/components/posts/post-report-form";
import { getClientFingerprint, getGuestFingerprint } from "@/lib/guest-client";
import { getGuestWriteHeaders } from "@/lib/guest-step-up.client";
import { COMMENT_CONTENT_MAX_LENGTH } from "@/lib/input-limits";
import { resolveUserDisplayName } from "@/lib/user-display";
import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/server/actions/comment";
import { muteUserAction, unmuteUserAction } from "@/server/actions/user-relation";

type CommentItem = {
  id: string;
  content: string;
  createdAt: Date | string;
  parentId: string | null;
  threadRootId?: string | null;
  threadPage?: number | null;
  status: PostStatus;
  likeCount: number;
  dislikeCount: number;
  reactions?: Array<{
    type: "LIKE" | "DISLIKE";
  }>;
  guestAuthorId?: string | null;
  guestDisplayName?: string | null;
  guestIpDisplay?: string | null;
  guestIpLabel?: string | null;
  isGuestAuthor?: boolean;
  isMutedByViewer?: boolean;
  author: { id: string; nickname: string | null };
};

type PostCommentThreadProps = {
  postId: string;
  comments: CommentItem[];
  bestComments: CommentItem[];
  totalCommentCount: number;
  currentPage: number;
  totalPages: number;
  currentUserId?: string;
  canInteract?: boolean;
  loginHref?: string;
  onCommentsChanged?: (page?: number) => Promise<void>;
  interactionDisabledMessage?: string;
};

type CommentFormState = {
  [key: string]: string;
};

const COMMENT_DIVIDER_CLASS_NAME = "divide-[#edf3fb]";
const COMMENT_BORDER_CLASS_NAME = "border-[#eaf1fb]";
const COMMENT_REPLY_GUIDE_CLASS_NAME =
  "before:bg-[#edf3fb] relative mt-2 ml-8 space-y-1.5 pl-3 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-px before:content-['']";
const COMMENT_REPLY_BADGE_CLASS_NAME =
  "tp-text-muted inline-flex h-5 items-center rounded-md border border-[#e7eef9] bg-white px-1.5 text-[10px] font-medium";
const COMMENT_AUTHOR_MENU_BUTTON_CLASS_NAME =
  "tp-text-heading inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md bg-transparent px-1 py-0.5 text-[13px] font-semibold transition hover:bg-[#f4f8ff] hover:text-[#2f5da4]";
const COMMENT_AUTHOR_MENU_PANEL_CLASS_NAME =
  "tp-border-muted absolute left-0 z-20 mt-1.5 min-w-[108px] rounded-md border bg-white p-1 shadow-[0_10px_24px_rgba(16,40,74,0.1)]";
const MUTED_COMMENT_PLACEHOLDER_TEXT = "뮤트한 사용자 댓글입니다.";
const MUTED_COMMENT_AUTHOR_NAME = "뮤트한 사용자";

export function shouldCloseCommentAuthorMenu(
  menuRoot: Pick<Node, "contains"> | null,
  target: EventTarget | null,
) {
  if (!menuRoot || !target) {
    return false;
  }

  return !menuRoot.contains(target as Node);
}

export function canOpenCommentAuthorMenu(viewerId?: string) {
  return Boolean(viewerId);
}

export function canMuteCommentAuthor(viewerId?: string, targetUserId?: string) {
  return Boolean(viewerId && targetUserId && viewerId !== targetUserId);
}

function formatCommentDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("ko-KR");
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalized = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "..."> = [];

  for (const page of normalized) {
    const last = items[items.length - 1];
    if (typeof last === "number" && page - last > 1) {
      items.push("...");
    }
    items.push(page);
  }

  return items;
}

function ReactionStatIcon({ type }: { type: "LIKE" | "DISLIKE" }) {
  return type === "LIKE" ? (
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
  ) : (
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
  );
}

function CommentAuthorMenu({
  userId,
  displayName,
  commentId,
  currentUserId,
  onActionMessage,
  onRelationChanged,
}: {
  userId: string;
  displayName: string;
  commentId: string;
  currentUserId?: string;
  onActionMessage?: (message: string) => void;
  onRelationChanged?: (commentId: string) => Promise<void>;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMutePending, startMuteTransition] = useTransition();
  const canMute = canMuteCommentAuthor(currentUserId, userId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeMenuIfOutside = (target: EventTarget | null) => {
      if (shouldCloseCommentAuthorMenu(menuRef.current, target)) {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      closeMenuIfOutside(event.target);
    };

    const handleFocusIn = (event: globalThis.FocusEvent) => {
      closeMenuIfOutside(event.target);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMute = () => {
    if (!canMute || isMutePending) {
      return;
    }

    startMuteTransition(async () => {
      const result = await muteUserAction(
        { targetUserId: userId },
        { revalidate: false },
      );
      if (!result.ok) {
        onActionMessage?.(result.message);
        return;
      }

      setIsOpen(false);
      onActionMessage?.("사용자를 뮤트했습니다.");
      if (onRelationChanged) {
        await onRelationChanged(commentId);
      }
    });
  };

  return (
    <div ref={menuRef} className="relative inline-flex max-w-full shrink-0">
      <button
        type="button"
        className={COMMENT_AUTHOR_MENU_BUTTON_CLASS_NAME}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="truncate">{displayName}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="mt-px h-3 w-3 shrink-0 text-[#6a84ac]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M2.25 4.5 6 8.25 9.75 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen ? (
        <div className={COMMENT_AUTHOR_MENU_PANEL_CLASS_NAME} role="menu">
          <Link
            href={`/users/${userId}`}
            role="menuitem"
            className="tp-text-heading block rounded px-2 py-1.5 text-[11px] hover:bg-[#f5f9ff]"
            onClick={() => setIsOpen(false)}
          >
            프로필 보기
          </Link>
          {canMute ? (
            <button
              type="button"
              role="menuitem"
              className="tp-text-heading block w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-[#f5f9ff]"
              onClick={handleMute}
              disabled={isMutePending}
            >
              뮤트
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PostCommentThread({
  postId,
  comments,
  bestComments,
  totalCommentCount,
  currentPage,
  totalPages,
  currentUserId,
  canInteract = true,
  loginHref = "/login",
  onCommentsChanged,
  interactionDisabledMessage,
}: PostCommentThreadProps) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [replyContent, setReplyContent] = useState<CommentFormState>({});
  const [editContent, setEditContent] = useState<CommentFormState>({});
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [guestActionPassword, setGuestActionPassword] = useState<Record<string, string>>({});
  const [guestActionPrompt, setGuestActionPrompt] = useState<Record<string, "EDIT" | "DELETE" | null>>({});
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [pendingBestCommentJump, setPendingBestCommentJump] = useState<{
    id: string;
    page: number;
  } | null>(null);
  const [pendingRelationFocusCommentId, setPendingRelationFocusCommentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const actionLockRef = useRef(false);
  const canComment = canInteract || !currentUserId;

  const handleCommentSubmitShortcut = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    submit: () => void,
  ) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  const repliesMap = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return map;
  }, [comments]);

  const roots = useMemo(() => comments.filter((comment) => comment.parentId === null), [comments]);

  const pageItems = buildPaginationItems(currentPage, totalPages);
  const hasBestComments = bestComments.length > 0;

  useEffect(() => {
    if (!pendingBestCommentJump || typeof document === "undefined") {
      return;
    }

    if (currentPage !== pendingBestCommentJump.page) {
      return;
    }

    const targetElement = document.getElementById(`comment-${pendingBestCommentJump.id}`);
    if (!targetElement) {
      setMessage("원댓글을 찾을 수 없습니다.");
      setPendingBestCommentJump(null);
      return;
    }

    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#comment-${pendingBestCommentJump.id}`);
    }
    setPendingBestCommentJump(null);
  }, [comments, currentPage, pendingBestCommentJump]);

  useEffect(() => {
    if (!pendingRelationFocusCommentId || typeof document === "undefined") {
      return;
    }

    const targetElement =
      document.getElementById(`comment-${pendingRelationFocusCommentId}`) ??
      document.getElementById(`best-comment-${pendingRelationFocusCommentId}`);

    if (!targetElement) {
      return;
    }

    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    setPendingRelationFocusCommentId(null);
  }, [bestComments, comments, pendingRelationFocusCommentId]);

  const handleBestCommentJump = async (comment: CommentItem) => {
    const targetPage = comment.threadPage ?? currentPage;
    setPendingBestCommentJump({
      id: comment.id,
      page: targetPage,
    });

    if (targetPage !== currentPage && onCommentsChanged) {
      await onCommentsChanged(targetPage);
    }
  };

  const refreshCommentsForRelationChange = async (commentId: string) => {
    setPendingRelationFocusCommentId(commentId);

    if (onCommentsChanged) {
      await onCommentsChanged(currentPage);
      return;
    }

    router.refresh();
  };

  const handleUnmute = (commentId: string, userId: string) => {
    startTransition(async () => {
      const result = await unmuteUserAction(
        { targetUserId: userId },
        { revalidate: false },
      );
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("사용자 뮤트를 해제했습니다.");
      await refreshCommentsForRelationChange(commentId);
    });
  };

  const handleCreate = (parentId?: string) => {
    if (actionLockRef.current) {
      return;
    }

    if (!canComment) {
      setMessage("현재 상태에서는 댓글을 작성할 수 없습니다.");
      return;
    }

    const content = parentId ? replyContent[parentId] : replyContent.root;
    if (!content) return;
    if (!currentUserId) {
      if (!guestDisplayName.trim()) {
        const nextMessage = "비회원 닉네임을 입력해 주세요.";
        setMessage(nextMessage);
        window.alert(nextMessage);
        return;
      }
      if (!guestPassword.trim()) {
        const nextMessage = "댓글 비밀번호를 입력해 주세요.";
        setMessage(nextMessage);
        window.alert(nextMessage);
        return;
      }
    }

    actionLockRef.current = true;
    startTransition(async () => {
      setMessage(null);
      try {
        const result = currentUserId
          ? await createCommentAction(postId, { content }, parentId, {
              clientFingerprint: getClientFingerprint(),
            })
          : await (async () => {
              try {
                const guestHeaders = await getGuestWriteHeaders("comment:create");
                const response = await fetch(`/api/posts/${postId}/comments`, {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                    ...guestHeaders,
                    "x-guest-mode": "1",
                  },
                  body: JSON.stringify({
                    content,
                    parentId,
                    guestDisplayName,
                    guestPassword,
                  }),
                });
                const payload = (await response.json()) as {
                  ok: boolean;
                  error?: { message?: string };
                };

                if (response.ok && payload.ok) {
                  return { ok: true } as const;
                }

                return {
                  ok: false,
                  message: payload.error?.message ?? "댓글 등록에 실패했습니다.",
                } as const;
              } catch (guestError) {
                return {
                  ok: false,
                  message:
                    guestError instanceof Error && guestError.message.trim().length > 0
                      ? guestError.message
                      : "네트워크 오류가 발생했습니다.",
                } as const;
              }
            })();

        if (!result.ok) {
          setMessage(result.message);
          if (!currentUserId) {
            window.alert(result.message);
          }
          return;
        }

        setReplyContent((prev) => ({ ...prev, [parentId ?? "root"]: "" }));
        if (parentId) {
          setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
          setCollapsedReplies((prev) => ({ ...prev, [parentId]: false }));
        }
        if (onCommentsChanged) {
          const nextPage = parentId ? currentPage : 1;
          await onCommentsChanged(nextPage);
        }
        router.refresh();
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  const handleUpdate = (commentId: string, isGuestComment: boolean) => {
    if (actionLockRef.current) {
      return;
    }

    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 수정할 수 있습니다.");
      return;
    }

    const content = editContent[commentId];
    if (!content) return;

    actionLockRef.current = true;
    startTransition(async () => {
      setMessage(null);
      try {
        const result = !isGuestComment
          ? await updateCommentAction(postId, commentId, { content })
          : await (async () => {
              const password = (guestActionPassword[commentId] ?? "").trim();
              if (!password) {
                return { ok: false, message: "비밀번호가 필요합니다." } as const;
              }

              const response = await fetch(`/api/comments/${commentId}`, {
                method: "PATCH",
                headers: {
                  "content-type": "application/json",
                  "x-guest-fingerprint": getGuestFingerprint(),
                  "x-guest-mode": "1",
                },
                body: JSON.stringify({ content, guestPassword: password }),
              });
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };

              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }

              return {
                ok: false,
                message: payload.error?.message ?? "댓글 수정에 실패했습니다.",
              } as const;
            })();

        if (!result.ok) {
          setMessage(result.message);
          if (isGuestComment) {
            window.alert(result.message);
          }
          return;
        }

        setEditOpen((prev) => ({ ...prev, [commentId]: false }));
        if (onCommentsChanged) {
          await onCommentsChanged(currentPage);
        }
        router.refresh();
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  const handleDelete = (
    commentId: string,
    isGuestComment: boolean,
    overridePassword?: string,
  ) => {
    if (actionLockRef.current) {
      return;
    }

    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 삭제할 수 있습니다.");
      return;
    }

    actionLockRef.current = true;
    startTransition(async () => {
      setMessage(null);
      try {
        const result = !isGuestComment
          ? await deleteCommentAction(postId, commentId)
          : await (async () => {
              const password = (overridePassword ?? guestActionPassword[commentId] ?? "").trim();
              if (!password) {
                return { ok: false, message: "비밀번호가 필요합니다." } as const;
              }

              const response = await fetch(`/api/comments/${commentId}`, {
                method: "DELETE",
                headers: {
                  "content-type": "application/json",
                  "x-guest-fingerprint": getGuestFingerprint(),
                  "x-guest-mode": "1",
                },
                body: JSON.stringify({ guestPassword: password }),
              });
              const payload = (await response.json()) as {
                ok: boolean;
                error?: { message?: string };
              };
              if (response.ok && payload.ok) {
                return { ok: true } as const;
              }
              return {
                ok: false,
                message: payload.error?.message ?? "댓글 삭제에 실패했습니다.",
              } as const;
            })();

        if (!result.ok) {
          setMessage(result.message);
          if (isGuestComment) {
            window.alert(result.message);
          }
          return;
        }

        setGuestActionPrompt((prev) => ({ ...prev, [commentId]: null }));
        if (onCommentsChanged) {
          await onCommentsChanged(currentPage);
        }
        router.refresh();
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  const confirmGuestAction = (commentId: string, action: "EDIT" | "DELETE") => {
    const password = (guestActionPassword[commentId] ?? "").trim();
    if (!password) {
      setMessage("댓글 비밀번호를 입력해 주세요.");
      return;
    }

    if (action === "EDIT") {
      setGuestActionPrompt((prev) => ({ ...prev, [commentId]: null }));
      setEditOpen((prev) => ({ ...prev, [commentId]: true }));
      return;
    }

    void handleDelete(commentId, true, password);
  };

  const renderComment = (comment: CommentItem, depth = 0) => {
    const replies = repliesMap.get(comment.id) ?? [];
    const isDeleted = comment.status === "DELETED";
    const isMutedPlaceholder = Boolean(comment.isMutedByViewer) && !isDeleted;
    const isGuestComment = Boolean(
      comment.isGuestAuthor || comment.guestAuthorId || comment.guestDisplayName?.trim(),
    );
    const guestAuthorName = comment.guestDisplayName?.trim()
      ? comment.guestDisplayName
      : resolveUserDisplayName(comment.author.nickname);
    const guestIpDisplay = comment.guestIpDisplay?.trim()
      ? comment.guestIpDisplay
      : `0.${comment.author.id.slice(-3)}`;
    const isAuthor = currentUserId && comment.author.id === currentUserId;
    const hasActiveReply = replies.some((reply) => reply.status === "ACTIVE");
    const canEdit =
      !isMutedPlaceholder && (isAuthor || isGuestComment) && !hasActiveReply && comment.status === "ACTIVE";
    const canOpenMenu = !isDeleted && !isMutedPlaceholder && canEdit;
    const canReply = !isMutedPlaceholder && canComment && comment.status === "ACTIVE";
    const canReport = Boolean(currentUserId) && !isMutedPlaceholder && comment.status === "ACTIVE" && !isAuthor;
    const canReactToComment = canUseCommentReaction({
      currentUserId,
      canInteract,
      isCommentActive: comment.status === "ACTIVE" && !isMutedPlaceholder,
    });
    const displayName = isMutedPlaceholder
      ? MUTED_COMMENT_AUTHOR_NAME
      : isGuestComment
        ? `${guestAuthorName} (${comment.guestIpLabel ?? "아이피"} ${guestIpDisplay})`
        : resolveUserDisplayName(comment.author.nickname);
    const avatarText = (isMutedPlaceholder ? "뮤" : displayName.slice(0, 1)).toUpperCase();
    const actionLinkClass =
      "tp-text-muted text-[11px] font-medium transition hover:text-[#2f5da4] hover:underline disabled:cursor-not-allowed disabled:opacity-50";
    const commentBodyText = isDeleted
      ? "삭제된 댓글입니다."
      : isMutedPlaceholder
        ? MUTED_COMMENT_PLACEHOLDER_TEXT
        : comment.content;

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={depth > 0 ? "mt-2" : undefined}
      >
        <article
          className={`flex gap-2.5 px-1 py-2.5 ${
            isDeleted ? "tp-surface-soft opacity-80" : isMutedPlaceholder ? "tp-surface-soft rounded-md" : ""
          }`}
        >
          <div className="tp-surface-alt tp-text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
            {avatarText}
          </div>

          <div className="min-w-0 flex-1">
            <header className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {isMutedPlaceholder || isGuestComment || !canOpenCommentAuthorMenu(currentUserId) ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="tp-text-heading truncate text-[13px] font-semibold">{displayName}</p>
                    <p suppressHydrationWarning className="tp-text-subtle text-[11px]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <CommentAuthorMenu
                      userId={comment.author.id}
                      displayName={displayName}
                      commentId={comment.id}
                      currentUserId={currentUserId}
                      onActionMessage={setMessage}
                      onRelationChanged={refreshCommentsForRelationChange}
                    />
                    <p suppressHydrationWarning className="tp-text-subtle text-[11px]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                )}
              </div>

              {!isDeleted && !isMutedPlaceholder ? (
                <div className="ml-auto flex shrink-0 items-start gap-1.5">
                  <CommentReactionControls
                    key={`${comment.id}:${comment.likeCount}:${comment.dislikeCount}:${comment.reactions?.[0]?.type ?? "NONE"}`}
                    postId={postId}
                    commentId={comment.id}
                    likeCount={comment.likeCount}
                    dislikeCount={comment.dislikeCount}
                    currentReaction={comment.reactions?.[0]?.type ?? null}
                    canReact={canReactToComment}
                    loginHref={loginHref}
                    compact
                    className="justify-end"
                    loginHintAlign="end"
                  />
                  {canOpenMenu ? (
                    <details className="relative">
                      <summary className="tp-text-muted list-none rounded-md px-1.5 py-0.5 text-[15px] leading-none hover:bg-[#f1f5fb]">
                        ···
                      </summary>
                      <div className="tp-border-muted absolute right-0 z-20 mt-1.5 min-w-24 rounded-md border bg-white p-1 shadow-[0_8px_18px_rgba(16,40,74,0.08)]">
                        {canEdit ? (
                          <>
                            <button
                              type="button"
                              className="tp-text-heading block w-full rounded px-2 py-1 text-left text-[11px] hover:bg-[#f5f9ff]"
                              onClick={() => {
                                if (isGuestComment) {
                                  setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "EDIT" }));
                                  return;
                                }
                                setEditOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }));
                              }}
                              disabled={isPending}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="block w-full rounded px-2 py-1 text-left text-[11px] text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                if (isGuestComment) {
                                  setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: "DELETE" }));
                                  return;
                                }
                                void handleDelete(comment.id, false);
                              }}
                              disabled={isPending}
                            >
                              삭제
                            </button>
                          </>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}
              {!isDeleted && isMutedPlaceholder && canMuteCommentAuthor(currentUserId, comment.author.id) ? (
                <div className="ml-auto flex shrink-0 items-start gap-1.5">
                  <button
                    type="button"
                    className="tp-text-muted rounded-md px-1.5 py-0.5 text-[11px] font-medium transition hover:bg-white hover:text-[#2f5da4] hover:underline"
                    onClick={() => handleUnmute(comment.id, comment.author.id)}
                    disabled={isPending}
                  >
                    뮤트 해제
                  </button>
                </div>
              ) : null}
            </header>

            <div
              className={`mt-1 text-[14px] leading-6 ${
                isDeleted || isMutedPlaceholder ? "tp-text-placeholder" : "tp-text-primary"
              }`}
            >
              <LinkifiedContent
                text={commentBodyText}
                showYoutubeEmbeds={!isDeleted && !isMutedPlaceholder}
              />
            </div>

            {!isDeleted && (canReply || canReport || (depth === 0 && replies.length > 0)) ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {canReply ? (
                    <button
                      type="button"
                      className={actionLinkClass}
                      onClick={() =>
                        setReplyOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                      }
                    >
                      {replyOpen[comment.id] ? "답글 취소" : "답글"}
                    </button>
                  ) : null}
                  {canReport ? (
                    <button
                      type="button"
                      className={actionLinkClass}
                      onClick={() =>
                        setReportOpen((prev) => ({
                          ...prev,
                          [comment.id]: !prev[comment.id],
                        }))
                      }
                    >
                      {reportOpen[comment.id] ? "신고 닫기" : "신고"}
                    </button>
                  ) : null}
                  {depth === 0 && replies.length > 0 ? (
                    <button
                      type="button"
                      className={actionLinkClass}
                      onClick={() =>
                        setCollapsedReplies((prev) => ({
                          ...prev,
                          [comment.id]: !prev[comment.id],
                        }))
                      }
                    >
                      {collapsedReplies[comment.id] ? `답글 ${replies.length}` : "접기"}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {reportOpen[comment.id] ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2.5`}>
                <PostReportForm
                  targetId={comment.id}
                  targetType={ReportTarget.COMMENT}
                  canReport={Boolean(currentUserId)}
                  loginHref={loginHref}
                />
              </div>
            ) : null}

            {canReply && replyOpen[comment.id] ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2`}>
                {!currentUserId ? (
                  <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
                    <input
                      className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} w-full px-2.5 py-1.5 text-[13px]`}
                      value={guestDisplayName}
                      onChange={(event) => setGuestDisplayName(event.target.value)}
                      placeholder="비회원 닉네임"
                      maxLength={24}
                    />
                    <input
                      className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} w-full px-2.5 py-1.5 text-[13px]`}
                      type="password"
                      value={guestPassword}
                      onChange={(event) => setGuestPassword(event.target.value)}
                      placeholder="댓글 비밀번호"
                      maxLength={32}
                    />
                  </div>
                ) : null}
                <textarea
                  className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-[64px] w-full px-2.5 py-1.5 text-[13px]`}
                  value={replyContent[comment.id] ?? ""}
                  onChange={(event) =>
                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: event.target.value,
                    }))
                  }
                  maxLength={COMMENT_CONTENT_MAX_LENGTH}
                  onKeyDown={(event) =>
                    handleCommentSubmitShortcut(event, () => handleCreate(comment.id))
                  }
                  placeholder="답글을 입력하세요"
                />
                <div className="mt-1.5 flex justify-end gap-1.5">
                  <button
                    type="button"
                    className="tp-btn-soft tp-btn-xs"
                    onClick={() =>
                      setReplyOpen((prev) => ({
                        ...prev,
                        [comment.id]: false,
                      }))
                    }
                    disabled={isPending}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="tp-btn-primary tp-btn-xs"
                    onClick={() => handleCreate(comment.id)}
                    disabled={isPending}
                  >
                    답글 등록
                  </button>
                </div>
              </div>
            ) : null}

            {isGuestComment && guestActionPrompt[comment.id] ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2`}>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} h-8 px-2.5 text-[12px]`}
                    placeholder="댓글 비밀번호"
                    value={guestActionPassword[comment.id] ?? ""}
                    onChange={(event) =>
                      setGuestActionPassword((prev) => ({
                        ...prev,
                        [comment.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="tp-btn-primary tp-btn-xs"
                    onClick={() =>
                      confirmGuestAction(
                        comment.id,
                        guestActionPrompt[comment.id] === "EDIT" ? "EDIT" : "DELETE",
                      )
                    }
                    disabled={isPending}
                  >
                    확인
                  </button>
                  <button
                    type="button"
                    className="tp-btn-soft tp-btn-xs"
                    onClick={() => setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: null }))}
                    disabled={isPending}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {(canInteract || isGuestComment) && editOpen[comment.id] && canEdit ? (
              <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} mt-2 p-2`}>
                <textarea
                  className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-[72px] w-full px-3 py-2 text-[13px]`}
                  value={editContent[comment.id] ?? comment.content}
                  onChange={(event) =>
                    setEditContent((prev) => ({
                      ...prev,
                      [comment.id]: event.target.value,
                    }))
                  }
                  maxLength={COMMENT_CONTENT_MAX_LENGTH}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="tp-btn-primary tp-btn-xs"
                    onClick={() => handleUpdate(comment.id, isGuestComment)}
                    disabled={isPending}
                  >
                    수정 저장
                  </button>
                </div>
              </div>
            ) : null}

            {replies.length > 0 && !collapsedReplies[comment.id] ? (
              <div className={COMMENT_REPLY_GUIDE_CLASS_NAME}>
                {replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    );
  };

  const renderBestComment = (comment: CommentItem) => {
    const isMutedPlaceholder = Boolean(comment.isMutedByViewer);
    const isGuestComment = Boolean(
      comment.isGuestAuthor || comment.guestAuthorId || comment.guestDisplayName?.trim(),
    );
    const guestAuthorName = comment.guestDisplayName?.trim()
      ? comment.guestDisplayName
      : resolveUserDisplayName(comment.author.nickname);
    const guestIpDisplay = comment.guestIpDisplay?.trim()
      ? comment.guestIpDisplay
      : `0.${comment.author.id.slice(-3)}`;
    const displayName = isMutedPlaceholder
      ? MUTED_COMMENT_AUTHOR_NAME
      : isGuestComment
        ? `${guestAuthorName} (${comment.guestIpLabel ?? "아이피"} ${guestIpDisplay})`
        : resolveUserDisplayName(comment.author.nickname);
    const authorNode = isMutedPlaceholder || isGuestComment || !canOpenCommentAuthorMenu(currentUserId) ? (
      <span className="tp-text-heading truncate text-[13px] font-semibold">{displayName}</span>
    ) : (
      <CommentAuthorMenu
        userId={comment.author.id}
        displayName={displayName}
        commentId={comment.id}
        currentUserId={currentUserId}
        onActionMessage={setMessage}
        onRelationChanged={refreshCommentsForRelationChange}
      />
    );

    return (
      <article
        key={`best-${comment.id}`}
        id={`best-comment-${comment.id}`}
        className="flex flex-col gap-2.5 px-3 py-3.5 sm:px-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex h-5 items-center rounded-md bg-[#2f6fda] px-1.5 text-[10px] font-semibold tracking-[0.03em] text-white">
                BEST
              </span>
              {comment.parentId ? (
                <span className={COMMENT_REPLY_BADGE_CLASS_NAME}>
                  답글
                </span>
              ) : null}
              {authorNode}
              <span suppressHydrationWarning className="tp-text-subtle text-[11px]">
                {formatCommentDate(comment.createdAt)}
              </span>
            </div>
            <p className="tp-text-primary mt-2 overflow-hidden whitespace-pre-line text-[13px] leading-6 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
              {isMutedPlaceholder ? MUTED_COMMENT_PLACEHOLDER_TEXT : comment.content}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
            <div className="tp-text-muted flex items-center gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1">
                <ReactionStatIcon type="LIKE" />
                <span>{comment.likeCount.toLocaleString()}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <ReactionStatIcon type="DISLIKE" />
                <span>{comment.dislikeCount.toLocaleString()}</span>
              </span>
            </div>
            {isMutedPlaceholder && canMuteCommentAuthor(currentUserId, comment.author.id) ? (
              <button
                type="button"
                className="tp-text-muted rounded-md px-1.5 py-0.5 text-[11px] font-medium transition hover:bg-white hover:text-[#2f5da4] hover:underline"
                onClick={() => handleUnmute(comment.id, comment.author.id)}
                disabled={isPending}
              >
                뮤트 해제
              </button>
            ) : null}
            {comment.threadPage && (comment.threadPage === currentPage || onCommentsChanged) ? (
              <button
                type="button"
                className="tp-text-muted rounded-md px-1.5 py-0.5 text-[11px] font-medium transition hover:bg-white hover:text-[#2f5da4] hover:underline"
                onClick={() => {
                  void handleBestCommentJump(comment);
                }}
              >
                원댓글로 가기
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className={POST_COMMENT_THREAD_CARD_CLASS_NAME}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="tp-text-section-title tp-text-heading">댓글 {totalCommentCount}</h2>
        {!hasBestComments && totalPages > 1 ? (
          <span className="tp-text-label text-[11px]">{currentPage} / {totalPages}</span>
        ) : null}
      </div>
      {message ? <p className="tp-text-subtle mt-2 text-[11px]">{message}</p> : null}

      {hasBestComments ? (
        <section className={`${COMMENT_BORDER_CLASS_NAME} mt-3 overflow-hidden rounded-md border bg-[#f7fbff] sm:mt-4`}>
          <div className={`${COMMENT_BORDER_CLASS_NAME} border-b px-3 py-2.5 sm:px-4`}>
            <h3 className="tp-text-heading text-[12px] font-semibold">베스트 댓글</h3>
          </div>
          <div className={`divide-y ${COMMENT_DIVIDER_CLASS_NAME}`}>
            {bestComments.map((comment) => renderBestComment(comment))}
          </div>
        </section>
      ) : null}

      {hasBestComments ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 sm:mt-5">
          <h3 className="tp-text-heading text-[12px] font-semibold">최신 댓글</h3>
          {totalPages > 1 ? (
            <span className="tp-text-label text-[11px]">{currentPage} / {totalPages}</span>
          ) : null}
        </div>
      ) : null}

      {roots.length === 0 ? (
        <p className="tp-text-subtle mt-4 text-[13px]">댓글이 없습니다.</p>
      ) : (
        <div className={`${COMMENT_BORDER_CLASS_NAME} mt-3 divide-y rounded-md border bg-white sm:mt-4 ${COMMENT_DIVIDER_CLASS_NAME}`}>
          {roots.map((comment) => renderComment(comment))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="tp-text-muted mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <button
            type="button"
            className={`rounded-lg ${currentPage <= 1 ? "tp-btn-disabled" : "tp-btn-soft"} tp-btn-xs`}
            onClick={() => void onCommentsChanged?.(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            이전
          </button>
          {pageItems.map((item, index) =>
            item === "..." ? (
              <span key={`bottom-ellipsis-${index}`} className="tp-text-placeholder px-1">
                ...
              </span>
            ) : (
              <button
                key={`bottom-${item}`}
                type="button"
                className={`min-w-7 rounded-lg ${item === currentPage ? "tp-btn-primary" : "tp-btn-soft"} tp-btn-xs`}
                onClick={() => void onCommentsChanged?.(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={`rounded-lg ${currentPage >= totalPages ? "tp-btn-disabled" : "tp-btn-soft"} tp-btn-xs`}
            onClick={() => void onCommentsChanged?.(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            다음
          </button>
        </div>
      ) : null}

      <div className={`${COMMENT_BORDER_CLASS_NAME} mt-3 border-t pt-2.5 sm:mt-4 sm:pt-3`}>
        <div className={`${POST_COMMENT_FORM_PANEL_CLASS_NAME} p-2.5 sm:p-2.5`}>
          {canComment ? (
            <>
              {!currentUserId ? (
                <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
                  <input
                    className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} w-full px-2.5 py-1.5 text-[13px]`}
                    value={guestDisplayName}
                    onChange={(event) => setGuestDisplayName(event.target.value)}
                    placeholder="비회원 닉네임"
                    maxLength={24}
                  />
                  <input
                    className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} w-full px-2.5 py-1.5 text-[13px]`}
                    type="password"
                    value={guestPassword}
                    onChange={(event) => setGuestPassword(event.target.value)}
                    placeholder="댓글 비밀번호"
                    maxLength={32}
                  />
                </div>
              ) : null}
              <textarea
                className={`tp-input-soft ${POST_COMMENT_FORM_FIELD_CLASS_NAME} min-h-[72px] w-full px-2.5 py-1.5 text-[13px] sm:min-h-[84px]`}
                value={replyContent.root ?? ""}
                onChange={(event) =>
                  setReplyContent((prev) => ({ ...prev, root: event.target.value }))
                }
                maxLength={COMMENT_CONTENT_MAX_LENGTH}
                onKeyDown={(event) => handleCommentSubmitShortcut(event, () => handleCreate())}
                placeholder="댓글을 입력해 주세요"
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  className="tp-btn-primary tp-btn-sm"
                  onClick={() => handleCreate()}
                  disabled={isPending}
                >
                  댓글 등록
                </button>
              </div>
            </>
          ) : (
            <div className={`${POST_COMMENT_FORM_MUTED_CLASS_NAME} tp-text-accent px-3 py-2 text-[13px]`}>
              {interactionDisabledMessage ? (
                interactionDisabledMessage
              ) : (
                <>
                  댓글 작성/답글/신고는 로그인 후 이용할 수 있습니다.{" "}
                  <Link
                    href={loginHref}
                    className="tp-text-link font-semibold underline underline-offset-2"
                  >
                    로그인하기
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
