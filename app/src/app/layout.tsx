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
  description: "Local-first pet community workspace",
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
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen bg-[#eaf2eb] text-[#12251b] antialiased`}
      >
        <div className="relative min-h-screen bg-[radial-gradient(circle_at_5%_10%,#f8fff8_0%,transparent_42%),radial-gradient(circle_at_100%_0%,#d9ecd9_0%,transparent_30%),linear-gradient(180deg,#edf6ee_0%,#e7f0e8_100%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(27,80,53,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,80,53,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />

          <header className="sticky top-0 z-40 border-b border-[#cfe1d2] bg-[#edf6eecc] backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 lg:py-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.4em] text-[#427256]">
                  TownPet
                </span>
                <span className="text-xl font-bold tracking-tight text-[#112a1f]">
                  Local Knowledge Desk
                </span>
              </div>
              <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#35644a] sm:text-sm">
                <Link
                  href="/"
                  className="rounded-full border border-[#bfd5c4] bg-white/90 px-3 py-1.5 transition hover:bg-[#f2faf4]"
                >
                  홈
                </Link>
                <Link
                  href="/my-posts"
                  className="rounded-full border border-[#bfd5c4] bg-white/90 px-3 py-1.5 transition hover:bg-[#f2faf4]"
                >
                  내 작성글
                </Link>
                <Link
                  href="/profile"
                  className="rounded-full border border-[#bfd5c4] bg-white/90 px-3 py-1.5 transition hover:bg-[#f2faf4]"
                >
                  내 프로필
                </Link>
                {canModerate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/admin/reports"
                      className="rounded-full border border-[#bfd5c4] bg-white/90 px-3 py-1.5 transition hover:bg-[#f2faf4]"
                    >
                      신고 큐
                    </Link>
                    <Link
                      href="/admin/auth-audits"
                      className="rounded-full border border-[#bfd5c4] bg-white/90 px-3 py-1.5 transition hover:bg-[#f2faf4]"
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
                    className="rounded-full border border-[#bfd5c4] bg-white/90 px-3 py-1.5 transition hover:bg-[#f2faf4]"
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
