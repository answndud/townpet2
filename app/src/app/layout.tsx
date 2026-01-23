import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen bg-[#f6f1e8] text-[#2a241c] antialiased`}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fefaf4,_#f6f1e8_60%)]">
          <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.35em] text-[#9a8462]">
                TownPet
              </span>
              <span className="text-lg font-semibold">Local Knowledge Desk</span>
            </div>
            <nav className="flex items-center gap-3 text-xs text-[#6f6046]">
              <Link
                href="/"
                className="rounded-full border border-[#e3d6c4] bg-white px-3 py-1"
              >
                홈
              </Link>
              <Link
                href="/my-posts"
                className="rounded-full border border-[#e3d6c4] px-3 py-1"
              >
                내 작성글
              </Link>
              <Link
                href="/profile"
                className="rounded-full border border-[#e3d6c4] px-3 py-1"
              >
                내 프로필
              </Link>
              <Link
                href="/admin/reports"
                className="rounded-full border border-[#e3d6c4] px-3 py-1"
              >
                신고 큐
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
