import Link from "next/link";
import Image from "next/image";

import { formatRelativeDate } from "@/lib/post-presenter";
import { resolveUserDisplayName } from "@/lib/user-display";
import type { AdoptionBoardPostItem } from "@/server/queries/community.queries";

type AdoptionBoardGridProps = {
  items: AdoptionBoardPostItem[];
  isAuthenticated: boolean;
};

const adoptionStatusLabel: Record<string, string> = {
  OPEN: "입양 가능",
  RESERVED: "상담 중",
  ADOPTED: "입양 완료",
  CLOSED: "마감",
};

const animalSexLabel: Record<string, string> = {
  MALE: "수컷",
  FEMALE: "암컷",
  UNKNOWN: "미상",
};

function buildSummary(item: AdoptionBoardPostItem) {
  const listing = item.adoptionListing;
  if (!listing) {
    return [];
  }

  return [
    listing.animalType,
    listing.breed,
    listing.ageLabel,
    listing.sex ? (animalSexLabel[listing.sex] ?? listing.sex) : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function buildBadgeLabel(item: AdoptionBoardPostItem) {
  const status = item.adoptionListing?.status;
  if (!status) {
    return "보호 중";
  }

  return adoptionStatusLabel[status] ?? status;
}

export function AdoptionBoardGrid({
  items,
  isAuthenticated,
}: AdoptionBoardGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const imageUrl = item.images[0]?.url ?? null;
        const listing = item.adoptionListing;
        const summary = buildSummary(item);
        const detailHref = isAuthenticated ? `/posts/${item.id}` : `/posts/${item.id}/guest`;

        return (
          <article
            key={item.id}
            className="overflow-hidden rounded-[28px] border border-[#d9e6f7] bg-white shadow-[0_14px_32px_rgba(16,40,74,0.08)]"
          >
            <Link href={detailHref} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#f7f4e8,#d8ecff)]">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={item.title}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-300 hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,#fff8d9,transparent_45%),linear-gradient(135deg,#ffe9b0,#d6e8ff)] p-4">
                    <div className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[#7b5c16]">
                      대표 이미지 준비 중
                    </div>
                  </div>
                )}
                <div className="absolute left-3 top-3 inline-flex rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#7b5c16]">
                  {buildBadgeLabel(item)}
                </div>
              </div>
            </Link>

            <div className="space-y-3 p-4">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8c9fbb]">
                  {listing?.shelterName ?? "보호소 정보 준비 중"}
                </p>
                <Link
                  href={detailHref}
                  className="line-clamp-2 text-lg font-semibold tracking-tight text-[#10284a] transition hover:text-[#2f5da4]"
                >
                  {item.title}
                </Link>
                <p className="text-sm text-[#557091]">
                  {[listing?.region, summary.join(" · ")].filter(Boolean).join(" · ")}
                </p>
              </div>

              <p className="line-clamp-2 text-sm leading-6 text-[#4f678d]">
                {item.content}
              </p>

              <div className="grid gap-2 rounded-2xl border border-[#e5edf8] bg-[#f8fbff] p-3 text-sm text-[#3e5f89]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#6c84a8]">체형</span>
                  <span className="font-medium text-[#204f8a]">
                    {listing?.sizeLabel ?? "미입력"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#6c84a8]">중성화</span>
                  <span className="font-medium text-[#204f8a]">
                    {listing?.isNeutered === null || listing?.isNeutered === undefined
                      ? "미입력"
                      : listing.isNeutered
                        ? "완료"
                        : "미완료"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#6c84a8]">예방접종</span>
                  <span className="font-medium text-[#204f8a]">
                    {listing?.isVaccinated === null || listing?.isVaccinated === undefined
                      ? "미입력"
                      : listing.isVaccinated
                        ? "완료"
                        : "미완료"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6580a7]">
                <span>{resolveUserDisplayName(item.author.nickname)}</span>
                <span>{formatRelativeDate(item.createdAt)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5c7499]">
                <span className="rounded-full border border-[#d7e4f6] bg-[#f7fbff] px-2 py-1">
                  좋아요 {item.likeCount}
                </span>
                <span className="rounded-full border border-[#d7e4f6] bg-[#f7fbff] px-2 py-1">
                  댓글 {item.commentCount}
                </span>
                <span className="rounded-full border border-[#d7e4f6] bg-[#f7fbff] px-2 py-1">
                  조회 {item.viewCount}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
