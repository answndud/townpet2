import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

import { AuthControls } from "@/components/auth/auth-controls";
import { FeedHoverMenu } from "@/components/navigation/feed-hover-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { auth } from "@/lib/auth";
import {
  PET_TYPE_PREFERENCE_COOKIE,
  parsePetTypePreferenceCookie,
} from "@/lib/pet-type-preference-cookie";
import { getSiteOrigin } from "@/lib/site-url";
import { listCommunityNavItems } from "@/server/queries/community.queries";
import { countUnreadNotifications } from "@/server/queries/notification.queries";
import { getUserById } from "@/server/queries/user.queries";
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

function extractPreferredPetTypeIds(user: unknown) {
  if (!user || typeof user !== "object") {
    return [];
  }

  const preferredPetTypes = (user as { preferredPetTypes?: unknown }).preferredPetTypes;
  if (!Array.isArray(preferredPetTypes)) {
    return [];
  }

  return preferredPetTypes
    .map((item) =>
      item && typeof item === "object"
        ? (item as { petTypeId?: string | null }).petTypeId
        : null,
    )
    .filter((petTypeId): petTypeId is string => typeof petTypeId === "string");
}

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
  const [session, communities] = await Promise.all([
    auth().catch(() => null),
    listCommunityNavItems(50).catch(() => []),
  ]);
  const userId = session?.user?.id ?? null;
  const [currentUser, unreadNotificationCount, cookieStore] = await Promise.all([
    userId ? getUserById(userId).catch(() => null) : Promise.resolve(null),
    userId ? countUnreadNotifications(userId).catch(() => 0) : Promise.resolve(0),
    cookies(),
  ]);
  const preferredPetTypeIds = extractPreferredPetTypeIds(currentUser);
  const canModerate =
    currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MODERATOR;
  const allPetTypeIds = communities.map((item) => item.id);
  const cookiePetTypeIds = parsePetTypePreferenceCookie(
    cookieStore.get(PET_TYPE_PREFERENCE_COOKIE)?.value,
  ).filter((id) => allPetTypeIds.includes(id));
  const initialPreferredPetTypeIds = currentUser
    ? preferredPetTypeIds.filter((id) => allPetTypeIds.includes(id)).length > 0
      ? preferredPetTypeIds.filter((id) => allPetTypeIds.includes(id))
      : allPetTypeIds
    : cookiePetTypeIds.length > 0
      ? cookiePetTypeIds
      : allPetTypeIds;
  const navLinkClass =
    "inline-flex h-8 items-center rounded-sm px-1 text-[14px] leading-none text-[#315484] transition hover:bg-[#dcecff] hover:text-[#1f4f8f]";

  return (
    <html lang="ko">
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${plexMono.variable} app-shell-bg min-h-screen text-[#10284a] antialiased`}
      >
        <header className="sticky top-0 z-40 border-b border-[#d8e4f6] bg-[#f4f8ffeb] backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-1.5 px-4 py-2 sm:gap-2 sm:px-6 sm:py-2.5 lg:px-10 lg:py-3 xl:flex-row xl:items-center xl:justify-between">
              <Link href="/" className="inline-flex items-center" aria-label="TownPet 홈으로 이동">
                <Image
                  src="/townpet-logo.svg"
                  alt="TownPet"
                  width={274}
                  height={72}
                  priority
                  className="h-[34px] w-auto sm:h-[40px]"
                />
              </Link>
              <nav className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] font-medium text-[#315484] sm:gap-x-3 sm:gap-y-1.5 xl:gap-x-3.5">
                <Link href="/feed" className={`${navLinkClass} md:hidden`}>
                  피드
                </Link>
                <FeedHoverMenu
                  communities={communities}
                  isAuthenticated={Boolean(currentUser)}
                  initialPreferredPetTypeIds={initialPreferredPetTypeIds}
                />
                <span className="hidden px-0.5 text-[#9ab0cf] md:inline">|</span>
                <Link href="/profile" className={navLinkClass}>
                  내 프로필
                </Link>
                {currentUser ? (
                  <>
                    <span className="hidden px-0.5 text-[#9ab0cf] md:inline">|</span>
                    <NotificationBell unreadCount={unreadNotificationCount} />
                  </>
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
                  <>
                    <span className="hidden px-0.5 text-[#9ab0cf] md:inline">|</span>
                    <AuthControls label="로그아웃" />
                  </>
                ) : (
                  <Link
                    href="/login"
                    className={`${navLinkClass} text-[#173963] hover:text-[#0f2f56]`}
                  >
                    로그인
                  </Link>
                )}
                <form action="/feed" method="get" className="ml-auto hidden items-center gap-2 md:flex">
                  <span className="px-0.5 text-[#9ab0cf]">|</span>
                  <input
                    name="q"
                    type="search"
                    placeholder="검색"
                    className="tp-input-soft h-8 w-[150px] bg-white px-2.5 text-xs leading-none sm:w-[190px]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-sm px-1 text-[13px] leading-none text-[#315484] transition hover:bg-[#dcecff] hover:text-[#1f4f8f]"
                  >
                    찾기
                  </button>
                </form>
              </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
