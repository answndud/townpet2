import Link from "next/link";

import { NotificationCenter } from "@/components/notifications/notification-center";
import {
  parseNotificationFilterKind,
  parseUnreadOnly,
} from "@/lib/notification-filter";
import { getCurrentUser } from "@/server/auth";
import { listNotificationsByUser } from "@/server/queries/notification.queries";

type NotificationsPageProps = {
  searchParams?: Promise<{ kind?: string; unreadOnly?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const currentUser = await getCurrentUser();
  const resolvedSearchParams = (await (searchParams ?? Promise.resolve({}))) as {
    kind?: string;
    unreadOnly?: string;
  };
  const kind = parseNotificationFilterKind(resolvedSearchParams.kind);
  const unreadOnly = parseUnreadOnly(resolvedSearchParams.unreadOnly);

  if (!currentUser) {
    return (
      <div className="min-h-screen pb-16">
        <main className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-8 sm:px-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]">알림</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            로그인 후 알림을 확인할 수 있습니다.
          </h1>
          <p className="text-sm text-[#4f678d]">
            댓글, 답글, 좋아요 알림은 로그인 사용자에게만 제공됩니다.
          </p>
          <div>
            <Link
              href="/login?next=%2Fnotifications"
              className="inline-flex border border-[#3567b5] bg-[#3567b5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f5da4]"
            >
              로그인하기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { items, nextCursor } = await listNotificationsByUser({
    userId: currentUser.id,
    limit: 20,
    kind,
    unreadOnly,
  });
  const initialItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    isRead: item.isRead,
    createdAt: item.createdAt.toISOString(),
    postId: item.postId,
    commentId: item.commentId,
    actor: item.actor
      ? {
          id: item.actor.id,
          nickname: item.actor.nickname,
          name: item.actor.name,
          image: item.actor.image,
        }
      : null,
  }));

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <NotificationCenter
          initialItems={initialItems}
          nextCursor={nextCursor}
          initialKind={kind}
          initialUnreadOnly={unreadOnly}
        />
      </main>
    </div>
  );
}
