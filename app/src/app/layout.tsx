import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { UserRole } from "@prisma/client";

import { AuthControls } from "@/components/auth/auth-controls";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { auth } from "@/lib/auth";
import { getSiteOrigin } from "@/lib/site-url";
import { getCurrentUser } from "@/server/auth";
import { countUnreadNotifications } from "@/server/queries/notification.queries";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "TownPet | 동네 기반 반려동물 커뮤니티",
    template: "%s | TownPet",
  },
  description:
    "우리 동네 반려생활을 나누는 커뮤니티. 병원 후기, 산책 코스, 질문/답변, 실종 제보까지 한 곳에서.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteOrigin,
    siteName: "TownPet",
    title: "TownPet | 동네 기반 반려동물 커뮤니티",
    description:
      "우리 동네 반려생활을 나누는 커뮤니티. 병원 후기, 산책 코스, 질문/답변, 실종 제보까지 한 곳에서.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TownPet | 동네 기반 반려동물 커뮤니티",
    description:
      "우리 동네 반려생활을 나누는 커뮤니티. 병원 후기, 산책 코스, 질문/답변, 실종 제보까지 한 곳에서.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth().catch(() => null);
  const currentUser = await getCurrentUser().catch(() => null);
  const canModerate =
    currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MODERATOR;
  const unreadNotificationCount = currentUser
    ? await countUnreadNotifications(currentUser.id).catch(() => 0)
    : 0;
  const userLabel =
    session?.user?.nickname ??
    session?.user?.name ??
    session?.user?.email ??
    null;
  const navLinkClass =
    "inline-flex h-9 items-center rounded-sm border border-[#bfd0ec] bg-white px-3.5 text-[13px] leading-none text-[#2f548f] transition hover:border-[#9fb7de] hover:bg-[#f5f9ff]";

  return (
    <html lang="ko">
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen bg-[#edf3fb] text-[#10284a] antialiased`}
      >
        <div className="relative min-h-screen bg-[radial-gradient(circle_at_0%_0%,#ffffff_0%,transparent_35%),radial-gradient(circle_at_100%_0%,#dfeaff_0%,transparent_30%),linear-gradient(180deg,#f3f8ff_0%,#ecf3fd_100%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(50,88,146,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(50,88,146,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />

          <header className="sticky top-0 z-40 border-b border-[#c7d7ef] bg-[#eef4ffdd] backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10 lg:py-5 xl:flex-row xl:items-center xl:justify-between">
              <Link href="/" className="inline-flex flex-col items-start leading-none">
                <span className="text-xs uppercase tracking-[0.32em] text-[#4a6797]">
                  TownPet
                </span>
                <span className="mt-0.5 text-xl font-bold tracking-tight text-[#10284a]">
                  타운펫
                </span>
              </Link>
              <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13px] font-medium text-[#315484]">
                <Link href="/feed" className={navLinkClass}>
                  피드
                </Link>
                <Link href="/my-posts" className={navLinkClass}>
                  내 작성글
                </Link>
                <Link href="/profile" className={navLinkClass}>
                  내 프로필
                </Link>
                {currentUser ? (
                  <NotificationBell unreadCount={unreadNotificationCount} />
                ) : null}
                {canModerate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/reports" className={navLinkClass}>
                      신고 큐
                    </Link>
                    <Link href="/admin/auth-audits" className={navLinkClass}>
                      인증 로그
                    </Link>
                    <Link href="/admin/policies" className={navLinkClass}>
                      권한 정책
                    </Link>
                  </div>
                ) : null}
                {session?.user ? (
                  <AuthControls
                    label={userLabel ? `${userLabel} 로그아웃` : "로그아웃"}
                  />
                ) : (
                  <Link href="/login" className={navLinkClass}>
                    로그인
                  </Link>
                )}
              </nav>
            </div>
          </header>

          <div className="relative z-10">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
