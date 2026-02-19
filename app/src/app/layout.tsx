import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { UserRole } from "@prisma/client";

import { AuthControls } from "@/components/auth/auth-controls";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/server/auth";
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

export const metadata: Metadata = {
  title: "TownPet",
  description: "동네 기반 반려동물 커뮤니티",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth().catch(() => null);
  const currentUser = await getCurrentUser();
  const canModerate =
    currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MODERATOR;
  const userLabel =
    session?.user?.nickname ??
    session?.user?.name ??
    session?.user?.email ??
    null;

  return (
    <html lang="ko">
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen bg-[#edf3fb] text-[#10284a] antialiased`}
      >
        <div className="relative min-h-screen bg-[radial-gradient(circle_at_0%_0%,#ffffff_0%,transparent_35%),radial-gradient(circle_at_100%_0%,#dfeaff_0%,transparent_30%),linear-gradient(180deg,#f3f8ff_0%,#ecf3fd_100%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(50,88,146,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(50,88,146,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />

          <header className="sticky top-0 z-40 border-b border-[#c7d7ef] bg-[#eef4ffdd] backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10 lg:py-5 xl:flex-row xl:items-center xl:justify-between">
              <Link href="/" className="inline-flex flex-col">
                <span className="text-xs uppercase tracking-[0.4em] text-[#4a6797]">
                  TownPet
                </span>
                <span className="text-xl font-bold tracking-tight text-[#10284a]">
                  타운펫
                </span>
              </Link>
              <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#315484] sm:text-sm">
                <Link
                  href="/feed"
                  className="border border-[#bfd0ec] bg-white px-3 py-1.5 transition hover:bg-[#f3f7ff]"
                >
                  피드
                </Link>
                <Link
                  href="/my-posts"
                  className="border border-[#bfd0ec] bg-white px-3 py-1.5 transition hover:bg-[#f3f7ff]"
                >
                  내 작성글
                </Link>
                <Link
                  href="/profile"
                  className="border border-[#bfd0ec] bg-white px-3 py-1.5 transition hover:bg-[#f3f7ff]"
                >
                  내 프로필
                </Link>
                {canModerate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/admin/reports"
                      className="border border-[#bfd0ec] bg-white px-3 py-1.5 transition hover:bg-[#f3f7ff]"
                    >
                      신고 큐
                    </Link>
                    <Link
                      href="/admin/auth-audits"
                      className="border border-[#bfd0ec] bg-white px-3 py-1.5 transition hover:bg-[#f3f7ff]"
                    >
                      인증 로그
                    </Link>
                  </div>
                ) : null}
                {session?.user ? (
                  <AuthControls
                    label={userLabel ? `${userLabel} 로그아웃` : "로그아웃"}
                  />
                ) : (
                  <Link
                    href="/login"
                    className="border border-[#bfd0ec] bg-white px-3 py-1.5 transition hover:bg-[#f3f7ff]"
                  >
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
