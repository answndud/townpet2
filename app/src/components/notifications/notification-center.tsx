"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
};

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
}: NotificationCenterProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const [isMarkAllPending, startMarkAllTransition] = useTransition();

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
      }
      setPending(item.id, false);
    }

    router.push(href);
    router.refresh();
  };

  const handleMarkAll = () => {
    setMessage(null);
    const unreadIds = items.filter((item) => !item.isRead).map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));

    startMarkAllTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        setMessage(result.message);
        setItems((prev) =>
          prev.map((item) =>
            unreadIds.includes(item.id) ? { ...item, isRead: false } : item,
          ),
        );
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
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isMarkAllPending || unreadCount === 0}
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

      {nextCursor ? (
        <p className="text-xs text-[#5f79a0]">
          다음 페이지 커서가 준비되어 있습니다. (Cycle 26 후속에서 무한 스크롤 연결 예정)
        </p>
      ) : null}
    </>
  );
}
