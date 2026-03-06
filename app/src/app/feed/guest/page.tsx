import { Suspense } from "react";
import type { Metadata } from "next";
import { GuestFeedPageClient } from "@/components/posts/guest-feed-page-client";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "피드",
  description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 피드",
    description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
    url: "/feed",
  },
};

export default function GuestFeedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fdfefe_55%,#fbfdff_100%)] pb-16">
          <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <section className="tp-card overflow-hidden">
              <EmptyState title="피드를 준비 중입니다" description="피드 화면을 불러오고 있습니다." />
            </section>
          </main>
        </div>
      }
    >
      <GuestFeedPageClient />
    </Suspense>
  );
}
