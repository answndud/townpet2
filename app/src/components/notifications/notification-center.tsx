"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { NotificationFilterKind } from "@/lib/notification-filter";
import { buildNotificationListHref } from "@/lib/notification-filter";
import {
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
    name: string | null;
    image: string | null;
  } | null;
};

type NotificationCenterProps = {
  initialItems: NotificationCenterItem[];
  nextCursor: string | null;
  initialKind: NotificationFilterKind;
  initialUnreadOnly: boolean;
};

type NotificationApiSuccess = {
  ok: true;
  data: {
    items: NotificationCenterItem[];
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

const filterTabs: Array<{ kind: NotificationFilterKind; label: string }> = [
  { kind: "ALL", label: "전체" },
  { kind: "COMMENT", label: "댓글/답글" },
  { kind: "REACTION", label: "반응" },
  { kind: "SYSTEM", label: "시스템" },
];

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

export function NotificationCenter({
  initialItems,
  nextCursor,
  initialKind,
  initialUnreadOnly,
}: NotificationCenterProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(nextCursor);
  const [kind, setKind] = useState<NotificationFilterKind>(initialKind);
  const [unreadOnly, setUnreadOnly] = useState(initialUnreadOnly);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [isMarkAllPending, startMarkAllTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  const setPending = (id: string, value: boolean) => {
    setPendingMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const markReadOptimistically = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  };

  const requestNotifications = useCallback(
    async (options: {
      cursor?: string | null;
      kind: NotificationFilterKind;
      unreadOnly: boolean;
    }) => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (options.cursor) {
        params.set("cursor", options.cursor);
      }
      if (options.kind !== "ALL") {
        params.set("kind", options.kind);
      }
      if (options.unreadOnly) {
        params.set("unreadOnly", "1");
      }

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await response.json()) as NotificationApiSuccess | NotificationApiError;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "알림을 불러오지 못했습니다." : payload.error.message);
      }

      return payload.data;
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const data = await requestNotifications({
        cursor,
        kind,
        unreadOnly,
      });

      setItems((prev) => {
        const merged = [...prev];
        const seen = new Set(prev.map((item) => item.id));

        for (const item of data.items) {
          if (seen.has(item.id)) {
            continue;
          }
          merged.push(item);
          seen.add(item.id);
        }

        return merged;
      });
      setCursor(data.nextCursor);
    } catch (error) {
      const nextMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "알림을 더 불러오지 못했습니다.";
      setLoadMoreError(nextMessage);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoadingMore, kind, unreadOnly, requestNotifications]);

  const handleApplyFilter = (nextKind: NotificationFilterKind, nextUnreadOnly: boolean) => {
    setMessage(null);
    setLoadMoreError(null);

    startFilterTransition(async () => {
      try {
        const data = await requestNotifications({
          kind: nextKind,
          unreadOnly: nextUnreadOnly,
        });
        setKind(nextKind);
        setUnreadOnly(nextUnreadOnly);
        setItems(data.items);
        setCursor(data.nextCursor);
        router.replace(buildNotificationListHref(nextKind, nextUnreadOnly), {
          scroll: false,
        });
      } catch (error) {
        const nextMessage =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "알림을 불러오지 못했습니다.";
        setMessage(nextMessage);
      }
    });
  };

  useEffect(() => {
    if (!cursor) {
      return;
    }

    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  const handleMarkRead = async (id: string) => {
    setMessage(null);
    const target = items.find((item) => item.id === id);
    if (!target || target.isRead) {
      return;
    }

    markReadOptimistically(id);
    setPending(id, true);

    const result = await markNotificationReadAction(id);
    if (!result.ok) {
      setMessage(result.message);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: false } : item)),
      );
    } else if (unreadOnly) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }

    setPending(id, false);
    router.refresh();
  };

  const handleMove = async (item: NotificationCenterItem) => {
    setMessage(null);
    const href = buildNotificationHref(item);

    if (!item.isRead) {
      markReadOptimistically(item.id);
      setPending(item.id, true);
      const result = await markNotificationReadAction(item.id);
      if (!result.ok) {
        setItems((prev) =>
          prev.map((candidate) =>
            candidate.id === item.id ? { ...candidate, isRead: false } : candidate,
          ),
        );
        setMessage(result.message);
      } else if (unreadOnly) {
        setItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
      }
      setPending(item.id, false);
    }

    router.push(href);
    router.refresh();
  };

  const handleMarkAll = () => {
    setMessage(null);
    const previousItems = items;
    const previousCursor = cursor;
    const unreadIds = previousItems.filter((item) => !item.isRead).map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    if (unreadOnly) {
      setItems([]);
      setCursor(null);
    } else {
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    }

    startMarkAllTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        setMessage(result.message);
        setItems(previousItems);
        setCursor(previousCursor);
      }
      router.refresh();
    });
  };

  return (
    <>
      <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">알림 센터</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-4xl">
          내 알림
        </h1>
        <p className="mt-2 text-sm text-[#4f678d] sm:text-base">미확인 알림 {unreadCount}건</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.kind}
              type="button"
              disabled={isFilterPending}
              onClick={() => handleApplyFilter(tab.kind, unreadOnly)}
              className={`border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                kind === tab.kind
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            disabled={isFilterPending}
            onClick={() => handleApplyFilter(kind, !unreadOnly)}
            className={`border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              unreadOnly
                ? "border-[#3567b5] bg-[#3567b5] text-white"
                : "border-[#bfd0ec] bg-white text-[#315484] hover:bg-[#f3f7ff]"
            }`}
          >
            읽지 않음만
          </button>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isMarkAllPending || isFilterPending || unreadCount === 0}
            className="border border-[#3567b5] bg-[#3567b5] px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#2f5da4]"
          >
            모두 읽음 처리
          </button>
          {message ? <span className="text-xs text-rose-600">{message}</span> : null}
        </div>
      </header>

      <section className="border border-[#c8d7ef] bg-white">
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#5f79a0]">
            도착한 알림이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-[#e1e9f5]">
            {items.map((notification) => {
              const actorLabel =
                notification.actor?.nickname ?? notification.actor?.name ?? "사용자";
              const isPending = pendingMap[notification.id] ?? false;

              return (
                <article
                  key={notification.id}
                  data-testid={`notification-item-${notification.id}`}
                  className={`px-5 py-4 ${notification.isRead ? "bg-white" : "bg-[#f7fbff]"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5f79a0]">
                    <span>{actorLabel}</span>
                    <span>{new Date(notification.createdAt).toLocaleString("ko-KR")}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#163462]">{notification.title}</p>
                  {notification.body ? (
                    <p className="mt-1 text-sm text-[#4f678d]">{notification.body}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      data-testid={`notification-move-${notification.id}`}
                      type="button"
                      onClick={() => void handleMove(notification)}
                      disabled={isPending}
                      className="border border-[#bfd0ec] bg-white px-2.5 py-1 text-xs font-semibold text-[#315484] transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#f3f7ff]"
                    >
                      이동
                    </button>
                    {!notification.isRead ? (
                      <button
                        data-testid={`notification-read-${notification.id}`}
                        type="button"
                        onClick={() => void handleMarkRead(notification.id)}
                        disabled={isPending}
                        className="border border-[#3567b5] bg-[#3567b5] px-2.5 py-1 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#2f5da4]"
                      >
                        읽음 처리
                      </button>
                    ) : (
                      <span className="border border-[#d7e3f5] bg-[#f4f8ff] px-2.5 py-1 text-xs text-[#5f79a0]">
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

      {cursor ? (
        <div className="flex flex-col items-start gap-2">
          <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isLoadingMore}
            className="border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#f3f7ff]"
          >
            {isLoadingMore ? "알림 불러오는 중..." : "알림 더 보기"}
          </button>
          {loadMoreError ? <p className="text-xs text-rose-600">{loadMoreError}</p> : null}
        </div>
      ) : items.length > 0 ? (
        <p className="text-xs text-[#5f79a0]">마지막 알림까지 모두 확인했습니다.</p>
      ) : null}
    </>
  );
}
