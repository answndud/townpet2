import { PostType } from "@prisma/client";

export const postTypeMeta: Record<
  PostType,
  { label: string; chipClass: string; icon: string }
> = {
  HOSPITAL_REVIEW: {
    label: "병원",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "H",
  },
  PLACE_REVIEW: {
    label: "장소",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "P",
  },
  WALK_ROUTE: {
    label: "산책",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    icon: "W",
  },
  MEETUP: {
    label: "번개",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: "M",
  },
  MARKET_LISTING: {
    label: "마켓",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
    icon: "K",
  },
  LOST_FOUND: {
    label: "실종",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "L",
  },
  QA_QUESTION: {
    label: "Q&A",
    chipClass: "border-teal-200 bg-teal-50 text-teal-700",
    icon: "Q",
  },
  QA_ANSWER: {
    label: "답변",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    icon: "A",
  },
  FREE_POST: {
    label: "자유",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    icon: "F",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    icon: "B",
  },
  DAILY_SHARE: {
    label: "일상공유",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
    icon: "D",
  },
  PRODUCT_REVIEW: {
    label: "제품리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "R",
  },
  PET_SHOWCASE: {
    label: "반려동물 자랑",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "S",
  },
};

export function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString("ko-KR");
}

export function formatCount(value?: number | null) {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;

  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safeValue);
}
