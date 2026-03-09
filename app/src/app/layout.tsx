import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { AppShellHeader } from "@/components/navigation/app-shell-header";
import { getSiteOrigin } from "@/lib/site-url";
import { listCommunityNavItems } from "@/server/queries/community.queries";
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
  const communities = await listCommunityNavItems(50).catch(() => []);

  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${plexMono.variable} app-shell-bg min-h-screen text-[#10284a] antialiased`}
      >
        <AppShellHeader communities={communities} />

        {children}
      </body>
    </html>
  );
}
