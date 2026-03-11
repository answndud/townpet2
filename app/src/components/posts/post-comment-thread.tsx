"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostStatus, ReportTarget } from "@prisma/client";
import { useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";

import { CommentReactionControls } from "@/components/posts/comment-reaction-controls";
import { LinkifiedContent } from "@/components/content/linkified-content";
import { POST_COMMENT_THREAD_CARD_CLASS_NAME } from "@/components/posts/post-comment-layout-class";
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

type CommentItem = {
  id: string;
  content: string;
  createdAt: Date | string;
  parentId: string | null;
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
  author: { id: string; nickname: string | null };
};

type PostCommentThreadProps = {
  postId: string;
  comments: CommentItem[];
  currentUserId?: string;
  canInteract?: boolean;
  loginHref?: string;
  onCommentsChanged?: () => Promise<void>;
  interactionDisabledMessage?: string;
};

type CommentFormState = {
  [key: string]: string;
};

const ROOTS_PER_PAGE = 30;

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

export function PostCommentThread({
  postId,
  comments,
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
  const [page, setPage] = useState(1);
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
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

  const totalPages = Math.max(1, Math.ceil(roots.length / ROOTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = buildPaginationItems(currentPage, totalPages);
  const pagedRoots = roots.slice((currentPage - 1) * ROOTS_PER_PAGE, currentPage * ROOTS_PER_PAGE);

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

        if (!parentId) {
          const nextRootCount = roots.length + 1;
          setPage(Math.max(1, Math.ceil(nextRootCount / ROOTS_PER_PAGE)));
        }

        setReplyContent((prev) => ({ ...prev, [parentId ?? "root"]: "" }));
        if (parentId) {
          setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
          setCollapsedReplies((prev) => ({ ...prev, [parentId]: false }));
        }
        if (onCommentsChanged) {
          await onCommentsChanged();
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
          await onCommentsChanged();
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
          await onCommentsChanged();
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
    const canEdit = (isAuthor || isGuestComment) && !hasActiveReply && comment.status === "ACTIVE";
    const canOpenMenu = !isDeleted && canEdit;
    const canReply = canComment && comment.status === "ACTIVE";
    const canReport = Boolean(currentUserId) && comment.status === "ACTIVE" && !isAuthor;
    const displayName = isGuestComment
      ? `${guestAuthorName} (${comment.guestIpLabel ?? "아이피"} ${guestIpDisplay})`
      : resolveUserDisplayName(comment.author.nickname);
    const avatarText = displayName.slice(0, 1).toUpperCase();
    const actionLinkClass =
      "tp-text-muted text-[11px] font-medium transition hover:text-[#2f5da4] hover:underline disabled:cursor-not-allowed disabled:opacity-50";

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={depth > 0 ? "mt-2" : undefined}
      >
        <article className={`flex gap-2.5 px-1 py-2.5 ${isDeleted ? "tp-surface-soft opacity-80" : ""}`}>
          <div className="tp-surface-alt tp-text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
            {avatarText}
          </div>

          <div className="min-w-0 flex-1">
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {isGuestComment ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="tp-text-heading truncate text-[13px] font-semibold">{displayName}</p>
                    <p suppressHydrationWarning className="tp-text-subtle text-[11px]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Link
                      href={`/users/${comment.author.id}`}
                      className="tp-text-heading truncate text-[13px] font-semibold hover:text-[#2f5da4]"
                    >
                      {displayName}
                    </Link>
                    <p suppressHydrationWarning className="tp-text-subtle text-[11px]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                )}
              </div>

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
            </header>

            <div className={`mt-1 text-[14px] leading-6 ${isDeleted ? "tp-text-placeholder" : "tp-text-primary"}`}>
              <LinkifiedContent
                text={isDeleted ? "삭제된 댓글입니다." : comment.content}
                showYoutubeEmbeds={!isDeleted}
              />
            </div>

            {!isDeleted ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CommentReactionControls
                    key={`${comment.id}:${comment.likeCount}:${comment.dislikeCount}:${comment.reactions?.[0]?.type ?? "NONE"}`}
                    postId={postId}
                    commentId={comment.id}
                    likeCount={comment.likeCount}
                    dislikeCount={comment.dislikeCount}
                    currentReaction={comment.reactions?.[0]?.type ?? null}
                    canReact={canInteract && comment.status === "ACTIVE"}
                    loginHref={loginHref}
                    compact
                    showDislike={false}
                  />
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
              <div className="tp-form-panel mt-2 p-2.5">
                <PostReportForm
                  targetId={comment.id}
                  targetType={ReportTarget.COMMENT}
                  canReport={Boolean(currentUserId)}
                  loginHref={loginHref}
                />
              </div>
            ) : null}

            {canReply && replyOpen[comment.id] ? (
              <div className="tp-form-panel mt-2 p-2">
                {!currentUserId ? (
                  <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
                    <input
                      className="tp-input-soft w-full bg-white px-2.5 py-1.5 text-[13px]"
                      value={guestDisplayName}
                      onChange={(event) => setGuestDisplayName(event.target.value)}
                      placeholder="비회원 닉네임"
                      maxLength={24}
                    />
                    <input
                      className="tp-input-soft w-full bg-white px-2.5 py-1.5 text-[13px]"
                      type="password"
                      value={guestPassword}
                      onChange={(event) => setGuestPassword(event.target.value)}
                      placeholder="댓글 비밀번호"
                      maxLength={32}
                    />
                  </div>
                ) : null}
                <textarea
                  className="tp-input-soft min-h-[64px] w-full bg-white px-2.5 py-1.5 text-[13px]"
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
              <div className="tp-form-panel mt-2 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    className="tp-input-soft h-8 bg-white px-2.5 text-[12px]"
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
              <div className="tp-form-panel mt-2 p-2">
                <textarea
                  className="tp-input-soft min-h-[72px] w-full bg-white px-3 py-2 text-[13px]"
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
              <div className="before:bg-[#d7e2f3] relative mt-2 ml-8 space-y-1.5 pl-3 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-px before:content-['']">
                {replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    );
  };

  return (
    <div className={POST_COMMENT_THREAD_CARD_CLASS_NAME}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="tp-text-section-title tp-text-heading">댓글 {comments.length}</h2>
        {totalPages > 1 ? <span className="tp-text-label text-[11px]">{currentPage} / {totalPages}</span> : null}
      </div>
      {message ? <p className="tp-text-subtle mt-2 text-[11px]">{message}</p> : null}

      {roots.length === 0 ? (
        <p className="tp-text-subtle mt-4 text-[13px]">댓글이 없습니다.</p>
      ) : (
        <div className="tp-border-soft mt-3 divide-y rounded-md border bg-white sm:mt-4">
          {pagedRoots.map((comment) => renderComment(comment))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="tp-text-muted mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <button
            type="button"
            className={`rounded-lg ${currentPage <= 1 ? "tp-btn-disabled" : "tp-btn-soft"} tp-btn-xs`}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={`rounded-lg ${currentPage >= totalPages ? "tp-btn-disabled" : "tp-btn-soft"} tp-btn-xs`}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            다음
          </button>
        </div>
      ) : null}

      <div className="tp-border-soft mt-3 border-t pt-2.5 sm:mt-4 sm:pt-3">
        <div className="tp-form-panel p-2.5 sm:p-2.5">
          {canComment ? (
            <>
              {!currentUserId ? (
                <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
                  <input
                    className="tp-input-soft w-full bg-white px-2.5 py-1.5 text-[13px]"
                    value={guestDisplayName}
                    onChange={(event) => setGuestDisplayName(event.target.value)}
                    placeholder="비회원 닉네임"
                    maxLength={24}
                  />
                  <input
                    className="tp-input-soft w-full bg-white px-2.5 py-1.5 text-[13px]"
                    type="password"
                    value={guestPassword}
                    onChange={(event) => setGuestPassword(event.target.value)}
                    placeholder="댓글 비밀번호"
                    maxLength={32}
                  />
                </div>
              ) : null}
              <textarea
                className="tp-input-soft min-h-[72px] w-full bg-white px-2.5 py-1.5 text-[13px] sm:min-h-[84px]"
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
            <div className="tp-form-panel-muted tp-text-accent px-3 py-2 text-[13px]">
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
