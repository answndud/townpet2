import { Suspense } from "react";
import type { Metadata } from "next";

import { GuestSearchPageClient } from "@/components/posts/guest-search-page-client";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "검색",
  description: "제목/내용/작성자 기준으로 게시글을 빠르게 찾으세요.",
  alternates: {
    canonical: "/search",
  },
  openGraph: {
    title: "TownPet 검색",
    description: "제목/내용/작성자 기준으로 게시글을 빠르게 찾으세요.",
    url: "/search",
  },
};

export default function GuestSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="tp-page-bg min-h-screen pb-16">
          <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
            <section className="tp-card overflow-hidden">
              <EmptyState title="검색을 준비 중입니다" description="검색 화면을 불러오고 있습니다." />
            </section>
          </main>
        </div>
      }
    >
      <GuestSearchPageClient />
    </Suspense>
  );
}
