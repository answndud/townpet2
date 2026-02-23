"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification";

type NotificationBellProps = {
  unreadCount: number;
};

type PreviewFilter = "ALL" | "UNREAD";

type NotificationPreviewItem = {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  postId: string | null;
  commentId: string | null;
  actor: {
    id: string;
    nickname: string | null;
    name: string | null;
    image: string | null;
  } | null;
};

type NotificationApiSuccess = {
  ok: true;
  data: {
    items: NotificationPreviewItem[];
    nextCursor: string | null;
  };
};

type NotificationApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

const PREVIEW_LIMIT = 6;

function buildNotificationHref(notification: {
  postId: string | null;
  commentId: string | null;
}) {
  if (notification.postId && notification.commentId) {
    return `/posts/${notification.postId}#comment-${notification.commentId}`;
  }
  if (notification.postId) {
    return `/posts/${notification.postId}`;
  }
  return "/notifications";
}

function formatRelativeLabel(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "방금";
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "방금";
  }
  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}일 전`;
  }

  return new Date(isoDate).toLocaleDateString("ko-KR");
}

export function NotificationBell({ unreadCount }: NotificationBellProps) {
  const normalizedCount = Number.isFinite(unreadCount) ? Math.max(0, unreadCount) : 0;
  const [localUnreadCount, setLocalUnreadCount] = useState(normalizedCount);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationPreviewItem[]>([]);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>("ALL");
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [isActionPending, startActionTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const badgeLabel = localUnreadCount > 99 ? "99+" : String(localUnreadCount);
  const filteredItems =
    previewFilter === "UNREAD" ? items.filter((item) => !item.isRead) : items;

  useEffect(() => {
    setLocalUnreadCount(normalizedCount);
  }, [normalizedCount]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const loadPreview = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({ limit: String(PREVIEW_LIMIT) });
      const response = await fetch(`/api/notifications?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as NotificationApiSuccess | NotificationApiError;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "알림을 불러오지 못했습니다." : payload.error.message);
      }

      setItems(payload.data.items);
      setLocalUnreadCount(payload.data.items.filter((item) => !item.isRead).length);
      setLoadedOnce(true);
    } catch (error) {
      setLoadError(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "알림을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && !loadedOnce && !isLoading) {
      void loadPreview();
    }
  };

  const markOneAsRead = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target || target.isRead) {
      return;
    }

    setActionMessage(null);
    startActionTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      setLocalUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  const markAllAsRead = () => {
    const hasUnread = items.some((item) => !item.isRead);
    if (!hasUnread) {
      return;
    }

    setActionMessage(null);
    startActionTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }

      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setLocalUnreadCount(0);
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpenToggle}
        className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#bfd0ec] bg-white px-3.5 text-[13px] leading-none text-[#2f548f] transition hover:border-[#9fb7de] hover:bg-[#f5f9ff]"
        aria-label={normalizedCount > 0 ? `알림 ${normalizedCount}개 미확인` : "알림함"}
        aria-expanded={isOpen}
        aria-controls="notification-popover"
      >
        <span>알림</span>
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-sm border px-1 text-[10px] font-semibold leading-4 ${
            normalizedCount > 0
              ? "border-[#3567b5] bg-[#3567b5] text-white"
              : "border-[#bfd0ec] bg-[#f5f8ff] text-[#4f678d]"
          }`}
        >
          {badgeLabel}
        </span>
      </button>

      {isOpen ? (
        <div
          id="notification-popover"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] rounded-md border border-[#bfd0ec] bg-white shadow-[0_16px_36px_rgba(16,40,74,0.14)]"
        >
          <div className="border-b border-[#dbe6f6] bg-[#f7fbff] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#204477]">새 알림 미리보기</p>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={isActionPending || items.every((item) => item.isRead)}
                className="inline-flex h-7 items-center rounded-sm border border-[#bfd0ec] bg-white px-2 text-[11px] font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                모두 읽음
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewFilter("ALL")}
                className={`inline-flex h-7 items-center rounded-sm border px-2 text-[11px] font-semibold transition ${
                  previewFilter === "ALL"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#bfd0ec] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setPreviewFilter("UNREAD")}
                className={`inline-flex h-7 items-center rounded-sm border px-2 text-[11px] font-semibold transition ${
                  previewFilter === "UNREAD"
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#bfd0ec] bg-white text-[#2f548f] hover:bg-[#f3f7ff]"
                }`}
              >
                안읽음
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto px-2 py-2">
            {isLoading ? (
              <p className="px-2 py-6 text-center text-xs text-[#5f79a0]">알림을 불러오는 중...</p>
            ) : null}

            {!isLoading && loadError ? (
              <p className="mx-1 rounded-sm border border-rose-200 bg-rose-50 px-2 py-2 text-xs text-rose-700">
                {loadError}
              </p>
            ) : null}

            {!isLoading && actionMessage ? (
              <p className="mx-1 mb-1 rounded-sm border border-rose-200 bg-rose-50 px-2 py-2 text-xs text-rose-700">
                {actionMessage}
              </p>
            ) : null}

            {!isLoading && !loadError && filteredItems.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-[#5f79a0]">
                {previewFilter === "UNREAD"
                  ? "미확인 알림이 없습니다."
                  : "아직 도착한 알림이 없습니다."}
              </p>
            ) : null}

            {!isLoading && !loadError
              ? filteredItems.map((item) => {
                  const actorName = item.actor?.nickname ?? item.actor?.name ?? "사용자";
                  return (
                    <div
                      key={item.id}
                      className={`block rounded-sm border px-2.5 py-2 transition ${
                        item.isRead
                          ? "mb-1 border-[#e2eaf6] bg-white hover:bg-[#f6f9ff]"
                          : "mb-1 border-[#cfe0f8] bg-[#f5f9ff] hover:bg-[#edf5ff]"
                      }`}
                    >
                      <Link href={buildNotificationHref(item)} onClick={() => setIsOpen(false)}>
                        <p className="text-[11px] text-[#607ca5]">
                          {actorName} · {formatRelativeLabel(item.createdAt)}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-[#183765]">{item.title}</p>
                        {item.body ? (
                          <p className="mt-0.5 overflow-hidden text-xs text-[#48658f] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                            {item.body}
                          </p>
                        ) : null}
                      </Link>
                      {!item.isRead ? (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => markOneAsRead(item.id)}
                            disabled={isActionPending}
                            className="inline-flex h-7 items-center rounded-sm border border-[#bfd0ec] bg-white px-2 text-[11px] font-semibold text-[#2f548f] transition hover:bg-[#f3f7ff] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            읽음 처리
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              : null}
          </div>

          <div className="border-t border-[#dbe6f6] p-2">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-9 w-full items-center justify-center rounded-sm border border-[#3567b5] bg-[#3567b5] px-3 text-xs font-semibold text-white transition hover:bg-[#2f5da4]"
            >
              알림 페이지로 이동
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
