import Link from "next/link";

type NotificationBellProps = {
  unreadCount: number;
};

export function NotificationBell({ unreadCount }: NotificationBellProps) {
  const normalizedCount = Number.isFinite(unreadCount) ? Math.max(0, unreadCount) : 0;
  const badgeLabel = normalizedCount > 99 ? "99+" : String(normalizedCount);

  return (
    <Link
      href="/notifications"
      className="inline-flex items-center gap-2 border border-[#bfd0ec] bg-white px-3 py-1.5 transition hover:bg-[#f3f7ff]"
      aria-label={
        normalizedCount > 0
          ? `알림 ${normalizedCount}개 미확인`
          : "알림함"
      }
    >
      <span>알림</span>
      <span
        className={`inline-flex min-w-5 items-center justify-center border px-1 text-[10px] font-semibold leading-4 ${
          normalizedCount > 0
            ? "border-[#3567b5] bg-[#3567b5] text-white"
            : "border-[#bfd0ec] bg-[#f5f8ff] text-[#4f678d]"
        }`}
      >
        {badgeLabel}
      </span>
    </Link>
  );
}
