"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatKoreanDateTime } from "@/lib/date-format";
import type { NotificationFilterKind } from "@/lib/notification-filter";
import { buildPaginationWindow } from "@/lib/pagination";
import {
  emitNotificationUnreadSync,
  subscribeNotificationUnreadSync,
} from "@/lib/notification-unread-sync";
import { buildNotificationListHref } from "@/lib/notification-filter";
import { resolveUserDisplayName } from "@/lib/user-display";
import {
  archiveNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification";

type NotificationCenterItem = {
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
    image: string | null;
  } | null;
};

type NotificationCenterProps = {
  initialItems: NotificationCenterItem[];
  initialUnreadCount: number;
  initialMessage?: string | null;
  currentPage: number;
  totalPages: number;
  initialKind: NotificationFilterKind;
  initialUnreadOnly: boolean;
};

function markItemRead(items: NotificationCenterItem[], id: string) {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          isRead: true,
        }
      : item,
  );
}

const filterTabs: Array<{ kind: NotificationFilterKind; label: string }> = [
  { kind: "ALL", label: "전체" },
  { kind: "COMMENT", label: "댓글/멘션" },
  { kind: "REACTION", label: "반응" },
  { kind: "SYSTEM", label: "시스템" },
];

function buildNotificationHref(notification: {
  id: string;
  postId: string | null;
  commentId: string | null;
}) {
  return `/notifications/redirect/${notification.id}`;
}

export function NotificationCenter({
  initialItems,
  initialUnreadCount,
  initialMessage = null,
  currentPage,
  totalPages,
  initialKind,
  initialUnreadOnly,
}: NotificationCenterProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(
    Number.isFinite(initialUnreadCount) ? Math.max(0, initialUnreadCount) : 0,
  );
  const kind = initialKind;
  const unreadOnly = initialUnreadOnly;
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const [isFilterPending, startFilterTransition] = useTransition();
  const [isMarkAllPending, startMarkAllTransition] = useTransition();

  useEffect(() => {
    setGlobalUnreadCount(Number.isFinite(initialUnreadCount) ? Math.max(0, initialUnreadCount) : 0);
  }, [initialUnreadCount]);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  useEffect(() => {
    return subscribeNotificationUnreadSync((payload) => {
      if (typeof payload.resetTo === "number" && Number.isFinite(payload.resetTo)) {
        setGlobalUnreadCount(Math.max(0, payload.resetTo));
        setItems((prev) =>
          unreadOnly
            ? []
            : prev.map((item) =>
                item.isRead
                  ? item
                  : {
                      ...item,
                      isRead: true,
                    },
              ),
        );
        return;
      }

      const delta = payload.delta;
      if (typeof delta === "number" && Number.isFinite(delta)) {
        setGlobalUnreadCount((prev) => Math.max(0, prev + delta));
      }

      if (payload.archiveIds && payload.archiveIds.length > 0) {
        const archiveIds = new Set(payload.archiveIds);
        setItems((prev) => prev.filter((item) => !archiveIds.has(item.id)));
      }

      if (payload.markReadIds && payload.markReadIds.length > 0) {
        const markReadIds = new Set(payload.markReadIds);
        setItems((prev) =>
          unreadOnly
            ? prev.filter((item) => !markReadIds.has(item.id))
            : prev.map((item) =>
                markReadIds.has(item.id)
                  ? {
                      ...item,
                      isRead: true,
                    }
                  : item,
              ),
        );
      }
    });
  }, [unreadOnly]);

  useEffect(() => {
    const refresh = () => {
      router.refresh();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  const setPending = (id: string, value: boolean) => {
    setPendingMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleApplyFilter = (nextKind: NotificationFilterKind, nextUnreadOnly: boolean) => {
    setMessage(null);
    startFilterTransition(() => {
      router.replace(buildNotificationListHref(nextKind, nextUnreadOnly, 1), {
        scroll: false,
      });
    });
  };

  const handleMarkRead = async (id: string) => {
    setMessage(null);
    const target = items.find((item) => item.id === id);
    if (!target || target.isRead) {
      return;
    }

    setPending(id, true);

    const result = await markNotificationReadAction(id);
    if (!result.ok) {
      setMessage(result.message);
    } else {
      setItems((prev) =>
        unreadOnly ? prev.filter((item) => item.id !== id) : markItemRead(prev, id),
      );
      setGlobalUnreadCount((prev) => Math.max(0, prev - 1));
      emitNotificationUnreadSync({ delta: -1, markReadIds: [id] });
    }

    setPending(id, false);
  };

  const handleMove = async (item: NotificationCenterItem) => {
    setMessage(null);
    const href = buildNotificationHref(item);

    if (!item.isRead) {
      setPending(item.id, true);
      const result = await markNotificationReadAction(item.id);
      if (!result.ok) {
        setMessage(result.message);
      } else {
        setItems((prev) =>
          unreadOnly
            ? prev.filter((candidate) => candidate.id !== item.id)
            : markItemRead(prev, item.id),
        );
        setGlobalUnreadCount((prev) => Math.max(0, prev - 1));
        emitNotificationUnreadSync({ delta: -1, markReadIds: [item.id] });
      }
      setPending(item.id, false);
    }

    router.push(href);
  };

  const handleMarkAll = () => {
    setMessage(null);
    const previousItems = items;
    const unreadIds = previousItems.filter((item) => !item.isRead).map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    if (unreadOnly) {
      setItems([]);
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.isRead
            ? item
            : {
                ...item,
                isRead: true,
              },
        ),
      );
    }

    startMarkAllTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        setMessage(result.message);
        setItems(previousItems);
        return;
      }
      setGlobalUnreadCount(0);
      emitNotificationUnreadSync({ resetTo: 0 });
    });
  };

  const handleArchive = async (id: string) => {
    setMessage(null);
    const target = items.find((item) => item.id === id);
    if (!target) {
      return;
    }

    setPending(id, true);
    const result = await archiveNotificationAction(id);

    if (!result.ok) {
      setMessage(result.message);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (!target.isRead) {
        setGlobalUnreadCount((prev) => Math.max(0, prev - 1));
        emitNotificationUnreadSync({ delta: -1, archiveIds: [id] });
      } else {
        emitNotificationUnreadSync({ archiveIds: [id] });
      }
    }

    setPending(id, false);
  };

  return (
    <>
      <header className="tp-hero p-5 sm:p-6">
        <p className="tp-eyebrow">알림 센터</p>
        <h1 className="tp-text-page-title tp-text-primary mt-2">
          내 알림
        </h1>
        <p className="tp-text-muted mt-2 text-sm">미확인 알림 {globalUnreadCount}건</p>
        <p className="tp-text-subtle mt-1 text-xs">
          읽음 처리 후에도 목록에 남아 있으며, 보관한 알림만 목록에서 숨겨집니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.kind}
              type="button"
              disabled={isFilterPending}
              onClick={() => handleApplyFilter(tab.kind, unreadOnly)}
              className={`tp-btn-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                kind === tab.kind
                  ? "tp-btn-primary"
                  : "tp-btn-soft"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            disabled={isFilterPending}
            onClick={() => handleApplyFilter(kind, !unreadOnly)}
            className={`tp-btn-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              unreadOnly
                ? "tp-btn-primary"
                : "tp-btn-soft"
            }`}
          >
            읽지 않음만
          </button>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isMarkAllPending || isFilterPending || globalUnreadCount === 0}
            className="tp-btn-primary tp-btn-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            모두 읽음 처리
          </button>
          {message ? <span className="text-xs text-rose-600">{message}</span> : null}
        </div>
      </header>

      <section className="tp-card overflow-hidden">
        {items.length === 0 ? (
          <div className="tp-text-subtle px-5 py-10 text-center text-sm">
            {unreadOnly ? "미확인 알림이 없습니다." : "도착한 알림이 없습니다."}
          </div>
        ) : (
          <div className="divide-y divide-[#e1e9f5]">
            {items.map((notification) => {
              const actorLabel =
                resolveUserDisplayName(notification.actor?.nickname, "사용자");
              const isPending = pendingMap[notification.id] ?? false;

              return (
                <article
                  key={notification.id}
                  data-testid={`notification-item-${notification.id}`}
                  className={`px-5 py-4 ${notification.isRead ? "bg-white" : "tp-surface-alt"}`}
                >
                  <div className="tp-text-subtle flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>{actorLabel}</span>
                    <span>{formatKoreanDateTime(notification.createdAt)}</span>
                  </div>
                  <p className="tp-text-card-title tp-text-heading mt-1">{notification.title}</p>
                  {notification.body ? (
                    <p className="tp-text-muted mt-1 text-[13px]">{notification.body}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      data-testid={`notification-move-${notification.id}`}
                      type="button"
                      onClick={() => void handleMove(notification)}
                      disabled={isPending}
                      className="tp-btn-soft tp-btn-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      이동
                    </button>
                    <button
                      data-testid={`notification-dismiss-${notification.id}`}
                      type="button"
                      onClick={() => void handleArchive(notification.id)}
                      disabled={isPending}
                      className="tp-btn-soft tp-btn-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      보관
                    </button>
                    {!notification.isRead ? (
                      <button
                        data-testid={`notification-read-${notification.id}`}
                        type="button"
                        onClick={() => void handleMarkRead(notification.id)}
                        disabled={isPending}
                        className="tp-btn-primary tp-btn-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        읽음 처리
                      </button>
                    ) : (
                      <span className="tp-border-soft tp-surface-soft tp-text-subtle rounded-md border px-2.5 py-1 text-xs">
                        읽음
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {items.length > 0 && totalPages > 1 ? (
        <div className="tp-border-soft flex flex-wrap items-center justify-center gap-1.5 rounded-[20px] border bg-white px-3 py-3">
          <Link
            href={buildNotificationListHref(kind, unreadOnly, Math.max(1, currentPage - 1))}
            aria-disabled={currentPage <= 1}
            className={`inline-flex items-center rounded-lg ${currentPage <= 1 ? "tp-btn-disabled pointer-events-none" : "tp-btn-soft"} tp-btn-xs transition`}
          >
            이전
          </Link>
          {buildPaginationWindow(currentPage, totalPages).map((pageNumber) => (
            <Link
              key={`notification-page-${pageNumber}`}
              href={buildNotificationListHref(kind, unreadOnly, pageNumber)}
              className={`inline-flex min-w-8 items-center justify-center rounded-lg ${pageNumber === currentPage ? "tp-btn-primary" : "tp-btn-soft"} tp-btn-xs transition`}
            >
              {pageNumber}
            </Link>
          ))}
          <Link
            href={buildNotificationListHref(kind, unreadOnly, Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage >= totalPages}
            className={`inline-flex items-center rounded-lg ${currentPage >= totalPages ? "tp-btn-disabled pointer-events-none" : "tp-btn-soft"} tp-btn-xs transition`}
          >
            다음
          </Link>
        </div>
      ) : items.length > 0 ? (
        <p className="tp-text-subtle text-xs">마지막 알림까지 모두 확인했습니다.</p>
      ) : null}
    </>
  );
}
