"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostStatus, ReportReason, ReportTarget } from "@prisma/client";
import { useMemo, useState, useTransition, type KeyboardEvent } from "react";

import { CommentReactionControls } from "@/components/posts/comment-reaction-controls";
import { LinkifiedContent } from "@/components/content/linkified-content";
import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/server/actions/comment";

type CommentItem = {
  id: string;
  content: string;
  createdAt: Date;
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
  author: { id: string; name: string | null; nickname: string | null };
};

type PostCommentThreadProps = {
  postId: string;
  comments: CommentItem[];
  currentUserId?: string;
  canInteract?: boolean;
  loginHref?: string;
  interactionDisabledMessage?: string;
};

type CommentFormState = {
  [key: string]: string;
};

const ROOTS_PER_PAGE = 30;

const GUEST_FP_STORAGE_KEY = "townpet:guest-fingerprint:v1";

function formatCommentDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("ko-KR");
}

function getGuestFingerprint() {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(GUEST_FP_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(GUEST_FP_STORAGE_KEY, created);
  return created;
}

const reasonLabels: Record<ReportReason, string> = {
  SPAM: "스팸",
  HARASSMENT: "괴롭힘",
  INAPPROPRIATE: "부적절",
  FAKE: "허위",
  OTHER: "기타",
};

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
  interactionDisabledMessage,
}: PostCommentThreadProps) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({});
  const [replyContent, setReplyContent] = useState<CommentFormState>({});
  const [editContent, setEditContent] = useState<CommentFormState>({});
  const [reportReason, setReportReason] = useState<Record<string, ReportReason>>({});
  const [reportDescription, setReportDescription] = useState<CommentFormState>({});
  const [reportOpen, setReportOpen] = useState<Record<string, boolean>>({});
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const [guestActionPassword, setGuestActionPassword] = useState<Record<string, string>>({});
  const [guestActionPrompt, setGuestActionPrompt] = useState<Record<string, "EDIT" | "DELETE" | null>>({});
  const [page, setPage] = useState(1);
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

    startTransition(async () => {
      setMessage(null);
      const result = currentUserId
        ? await createCommentAction(postId, { content }, parentId)
        : await fetch(`/api/posts/${postId}/comments`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-guest-fingerprint": getGuestFingerprint(),
              "x-guest-mode": "1",
            },
            body: JSON.stringify({
              content,
              parentId,
              guestDisplayName,
              guestPassword,
            }),
          })
            .then(async (response) => {
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
            })
            .catch(() => ({ ok: false, message: "네트워크 오류가 발생했습니다." } as const));

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
      router.refresh();
    });
  };

  const handleUpdate = (commentId: string, isGuestComment: boolean) => {
    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 수정할 수 있습니다.");
      return;
    }

    const content = editContent[commentId];
    if (!content) return;

    startTransition(async () => {
      setMessage(null);
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
      router.refresh();
    });
  };

  const handleDelete = (
    commentId: string,
    isGuestComment: boolean,
    overridePassword?: string,
  ) => {
    if (!canInteract && !isGuestComment) {
      setMessage("로그인 후 댓글을 삭제할 수 있습니다.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
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
      router.refresh();
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

  const handleReport = (commentId: string) => {
    if (!canInteract) {
      setMessage("로그인 후 신고할 수 있습니다.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: ReportTarget.COMMENT,
          targetId: commentId,
          reason: reportReason[commentId] ?? ReportReason.SPAM,
          description: reportDescription[commentId]?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setMessage(payload?.error?.message ?? "신고에 실패했습니다.");
        return;
      }

      setReportOpen((prev) => ({ ...prev, [commentId]: false }));
      setMessage("신고가 접수되었습니다.");
    });
  };

  const renderComment = (comment: CommentItem, depth = 0) => {
    const replies = repliesMap.get(comment.id) ?? [];
    const isDeleted = comment.status === "DELETED";
    const isGuestComment = Boolean(
      comment.isGuestAuthor || comment.guestAuthorId || comment.guestDisplayName?.trim(),
    );
    const guestAuthorName = comment.guestDisplayName?.trim()
      ? comment.guestDisplayName
      : comment.author.nickname ?? comment.author.name ?? "익명";
    const guestIpDisplay = comment.guestIpDisplay?.trim()
      ? comment.guestIpDisplay
      : `0.${comment.author.id.slice(-3)}`;
    const isAuthor = currentUserId && comment.author.id === currentUserId;
    const hasActiveReply = replies.some((reply) => reply.status === "ACTIVE");
    const canEdit = (isAuthor || isGuestComment) && !hasActiveReply && comment.status === "ACTIVE";
    const canOpenMenu =
      !isDeleted && (canEdit || (canInteract && !isAuthor && comment.status === "ACTIVE"));
    const canReply = canComment && comment.status === "ACTIVE";
    const displayName = isGuestComment
      ? `${guestAuthorName} (${comment.guestIpLabel ?? "아이피"} ${guestIpDisplay})`
      : comment.author.nickname ?? comment.author.name ?? "익명";
    const avatarText = displayName.slice(0, 1).toUpperCase();
    const actionLinkClass =
      "text-[12px] font-medium text-[#4a668f] transition hover:text-[#2f5da4] hover:underline disabled:cursor-not-allowed disabled:opacity-50";

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={depth > 0 ? "mt-2" : undefined}
      >
        <article className={`flex gap-3 px-1.5 py-3.5 ${isDeleted ? "bg-[#f8fbff] opacity-80" : ""}`}>
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf3fb] text-[12px] font-semibold text-[#44638f]">
            {avatarText}
          </div>

          <div className="min-w-0 flex-1">
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {isGuestComment ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="truncate text-sm font-semibold text-[#2f4f7d]">{displayName}</p>
                    <p suppressHydrationWarning className="text-[11px] text-[#7a8eae]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Link
                      href={`/users/${comment.author.id}`}
                      className="truncate text-sm font-semibold text-[#2f4f7d] hover:text-[#2f5da4]"
                    >
                      {displayName}
                    </Link>
                    <p suppressHydrationWarning className="text-[11px] text-[#7a8eae]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                )}
              </div>

              {canOpenMenu ? (
                <details className="relative">
                  <summary className="list-none rounded-full px-2 py-0.5 text-lg leading-none text-[#6a81a6] hover:bg-[#f1f5fb]">
                    ···
                  </summary>
                  <div className="absolute right-0 z-20 mt-1.5 min-w-24 rounded-md border border-[#d6e1f3] bg-white p-1 shadow-[0_8px_18px_rgba(16,40,74,0.08)]">
                    {canEdit ? (
                      <>
                        <button
                          type="button"
                          className="block w-full rounded px-2 py-1 text-left text-xs text-[#2f4f7d] hover:bg-[#f3f7ff]"
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
                          className="block w-full rounded px-2 py-1 text-left text-xs text-rose-700 hover:bg-rose-50"
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
                    {canInteract && !isAuthor && comment.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className="block w-full rounded px-2 py-1 text-left text-xs text-[#2f4f7d] hover:bg-[#f3f7ff]"
                        onClick={() =>
                          setReportOpen((prev) => ({
                            ...prev,
                            [comment.id]: !prev[comment.id],
                          }))
                        }
                      >
                        신고
                      </button>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </header>

            <div className={`mt-1.5 text-[15px] leading-relaxed ${isDeleted ? "text-[#8ba0bf]" : "text-[#27466f]"}`}>
              <LinkifiedContent
                text={isDeleted ? "삭제된 댓글입니다." : comment.content}
                showYoutubeEmbeds={!isDeleted}
              />
            </div>

            {!isDeleted ? (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <CommentReactionControls
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
                      {collapsedReplies[comment.id]
                        ? `답글 ${replies.length}개 펼치기`
                        : `답글 ${replies.length}개 접기`}
                    </button>
                  ) : null}
                </div>

              </div>
            ) : null}

            {canReply && replyOpen[comment.id] ? (
              <div className="mt-2.5 rounded-sm bg-[#f8fbff] p-2">
                {!currentUserId ? (
                  <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
                    <input
                      className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                      value={guestDisplayName}
                      onChange={(event) => setGuestDisplayName(event.target.value)}
                      placeholder="비회원 닉네임"
                      maxLength={24}
                    />
                    <input
                      className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                      type="password"
                      value={guestPassword}
                      onChange={(event) => setGuestPassword(event.target.value)}
                      placeholder="댓글 비밀번호"
                      maxLength={32}
                    />
                  </div>
                ) : null}
                <textarea
                  className="min-h-[68px] w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                  value={replyContent[comment.id] ?? ""}
                  onChange={(event) =>
                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) =>
                    handleCommentSubmitShortcut(event, () => handleCreate(comment.id))
                  }
                  placeholder="답글을 입력하세요"
                />
                <div className="mt-1.5 flex justify-end gap-1.5">
                  <button
                    type="button"
                    className="border border-[#bfd0ec] bg-white px-3 py-1 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
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
                    className="border border-[#3567b5] bg-[#3567b5] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                    onClick={() => handleCreate(comment.id)}
                    disabled={isPending}
                  >
                    답글 등록
                  </button>
                </div>
              </div>
            ) : null}

        {isGuestComment && guestActionPrompt[comment.id] ? (
          <div className="mt-3 border border-[#dbe5f3] bg-[#f8fbff] p-2">
            <p className="mb-2 text-xs text-[#5a7398]">
              {guestActionPrompt[comment.id] === "EDIT"
                ? "수정을 위해 댓글 비밀번호를 입력해 주세요."
                : "삭제를 위해 댓글 비밀번호를 입력해 주세요."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                className="h-8 border border-[#bfd0ec] bg-white px-2.5 text-xs text-[#1f3f71]"
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
                className="h-8 border border-[#3567b5] bg-[#3567b5] px-3 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
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
                className="h-8 border border-[#bfd0ec] bg-white px-3 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
                onClick={() => setGuestActionPrompt((prev) => ({ ...prev, [comment.id]: null }))}
                disabled={isPending}
              >
                취소
              </button>
            </div>
          </div>
        ) : null}

        {(canInteract || isGuestComment) && editOpen[comment.id] && canEdit ? (
          <div className="mt-3">
            <textarea
              className="min-h-[80px] w-full border border-[#bfd0ec] bg-[#f8fbff] px-3 py-2 text-sm text-[#1f3f71]"
              value={editContent[comment.id] ?? comment.content}
              onChange={(event) =>
                setEditContent((prev) => ({
                  ...prev,
                  [comment.id]: event.target.value,
                }))
              }
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="border border-[#3567b5] bg-[#3567b5] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                onClick={() => handleUpdate(comment.id, isGuestComment)}
                disabled={isPending}
              >
                수정 저장
              </button>
            </div>
          </div>
        ) : null}

        {canInteract && reportOpen[comment.id] && !isAuthor ? (
          <div className="mt-3 border border-[#bfd0ec] bg-[#f8fbff] p-3 text-xs text-[#355988]">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border border-[#bfd0ec] bg-white px-2 py-1"
                value={reportReason[comment.id] ?? ReportReason.SPAM}
                onChange={(event) =>
                  setReportReason((prev) => ({
                    ...prev,
                    [comment.id]: event.target.value as ReportReason,
                  }))
                }
              >
                {Object.values(ReportReason).map((value) => (
                  <option key={value} value={value}>
                    {reasonLabels[value]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="border border-rose-300 bg-white px-2 py-1 text-rose-700 transition hover:bg-rose-50"
                onClick={() => handleReport(comment.id)}
                disabled={isPending}
              >
                접수
              </button>
            </div>
            <textarea
              className="mt-2 w-full border border-[#bfd0ec] bg-white px-2 py-1 text-xs"
              value={reportDescription[comment.id] ?? ""}
              onChange={(event) =>
                setReportDescription((prev) => ({
                  ...prev,
                  [comment.id]: event.target.value,
                }))
              }
              placeholder="상세 설명(선택)"
            />
          </div>
        ) : null}

            {replies.length > 0 && !collapsedReplies[comment.id] ? (
              <div className="relative mt-2 ml-10 space-y-1.5 pl-4 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-px before:bg-[#d7e2f3] before:content-['']">
                {replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    );
  };

  return (
    <div className="mt-6 w-full rounded-lg border border-[#c8d7ef] bg-white p-4 shadow-[0_8px_18px_rgba(16,40,74,0.04)] sm:mt-8 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1f3f71]">댓글 {comments.length}</h2>
        {roots.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-[#4f678d]">
            {totalPages > 1 ? (
              <>
                <button
                  type="button"
                  className="rounded border border-[#c7d7ef] bg-white px-2 py-0.5 text-[#315484] disabled:opacity-40"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  이전
                </button>
                {pageItems.map((item, index) =>
                  item === "..." ? (
                    <span key={`ellipsis-${index}`} className="px-1 text-[#8ca0bf]">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`min-w-7 rounded border px-2 py-0.5 ${
                        item === currentPage
                          ? "border-[#3567b5] bg-[#3567b5] text-white"
                          : "border-[#c7d7ef] bg-white text-[#315484] hover:bg-[#f3f7ff]"
                      }`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="rounded border border-[#c7d7ef] bg-white px-2 py-0.5 text-[#315484] disabled:opacity-40"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  다음
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {message ? <p className="mt-2 text-xs text-[#5a7398]">{message}</p> : null}

      {roots.length === 0 ? (
        <p className="mt-4 text-sm text-[#5a7398]">첫 댓글을 남겨주세요.</p>
      ) : (
        <div className="mt-3 rounded-md border border-[#dbe5f3] divide-y divide-[#dbe5f3] bg-white sm:mt-4">
          {pagedRoots.map((comment) => renderComment(comment))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-[#4f678d]">
          <button
            type="button"
            className="rounded border border-[#c7d7ef] bg-white px-2 py-0.5 text-[#315484] disabled:opacity-40"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            이전
          </button>
          {pageItems.map((item, index) =>
            item === "..." ? (
              <span key={`bottom-ellipsis-${index}`} className="px-1 text-[#8ca0bf]">
                ...
              </span>
            ) : (
              <button
                key={`bottom-${item}`}
                type="button"
                className={`min-w-7 rounded border px-2 py-0.5 ${
                  item === currentPage
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#c7d7ef] bg-white text-[#315484] hover:bg-[#f3f7ff]"
                }`}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className="rounded border border-[#c7d7ef] bg-white px-2 py-0.5 text-[#315484] disabled:opacity-40"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            다음
          </button>
        </div>
      ) : null}

      <div className="mt-3 border-t border-[#c8d7ef] pt-2.5 sm:mt-4 sm:pt-3">
        <div className="rounded-sm border border-[#dbe6f6] bg-[#f8fbff] p-2.5 sm:p-2.5">
          {canComment ? (
            <>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6f9a]">
                댓글 작성
              </p>
              <p className="mb-1.5 text-xs text-[#5c7da8]">배려 있는 댓글 문화를 함께 만들어 주세요.</p>
              {!currentUserId ? (
                <div className="mb-1.5 grid gap-1.5 sm:grid-cols-2">
                  <input
                    className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                    value={guestDisplayName}
                    onChange={(event) => setGuestDisplayName(event.target.value)}
                    placeholder="비회원 닉네임"
                    maxLength={24}
                  />
                  <input
                    className="w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71]"
                    type="password"
                    value={guestPassword}
                    onChange={(event) => setGuestPassword(event.target.value)}
                    placeholder="댓글 비밀번호"
                    maxLength={32}
                  />
                </div>
              ) : null}
              <textarea
                className="min-h-[78px] w-full border border-[#bfd0ec] bg-white px-2.5 py-1.5 text-sm text-[#1f3f71] sm:min-h-[88px]"
                value={replyContent.root ?? ""}
                onChange={(event) =>
                  setReplyContent((prev) => ({ ...prev, root: event.target.value }))
                }
                onKeyDown={(event) => handleCommentSubmitShortcut(event, () => handleCreate())}
                placeholder="댓글을 입력해 주세요"
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  className="border border-[#3567b5] bg-[#3567b5] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
                  onClick={() => handleCreate()}
                  disabled={isPending}
                >
                  댓글 등록
                </button>
              </div>
            </>
          ) : (
            <div className="border border-[#d3e0f4] bg-white px-4 py-3 text-sm text-[#355988]">
              {interactionDisabledMessage ? (
                interactionDisabledMessage
              ) : (
                <>
                  댓글 작성/답글/신고는 로그인 후 이용할 수 있습니다.{" "}
                  <Link
                    href={loginHref}
                    className="font-semibold text-[#2f5da4] underline underline-offset-2"
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
