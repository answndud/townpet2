import { PostType } from "@prisma/client";

export type PostSignal = "image" | "twitter" | "instagram" | "link";
export type PostTypeMeta = {
  label: string;
  chipClass: string;
  icon: string;
};

const URL_REGEX = /https?:\/\/[^\s)]+/gi;
const FALLBACK_POST_TYPE_META: PostTypeMeta = {
  label: "게시글",
  chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
  icon: "P",
};

export const postTypeMeta: Record<
  PostType,
  PostTypeMeta
> = {
  HOSPITAL_REVIEW: {
    label: "병원후기",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "H",
  },
  PLACE_REVIEW: {
    label: "리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "P",
  },
  WALK_ROUTE: {
    label: "동네 산책코스",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    icon: "W",
  },
  MEETUP: {
    label: "동네모임",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: "M",
  },
  MARKET_LISTING: {
    label: "중고/공동구매",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
    icon: "K",
  },
  ADOPTION_LISTING: {
    label: "유기동물 입양",
    chipClass: "border-amber-200 bg-amber-50 text-amber-700",
    icon: "A",
  },
  SHELTER_VOLUNTEER: {
    label: "보호소 봉사 모집",
    chipClass: "border-lime-200 bg-lime-50 text-lime-700",
    icon: "V",
  },
  LOST_FOUND: {
    label: "실종/목격 제보",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "L",
  },
  QA_QUESTION: {
    label: "질문/답변",
    chipClass: "border-teal-200 bg-teal-50 text-teal-700",
    icon: "Q",
  },
  QA_ANSWER: {
    label: "질문/답변",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
    icon: "A",
  },
  FREE_POST: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    icon: "F",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    icon: "B",
  },
  DAILY_SHARE: {
    label: "자유게시판",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
    icon: "D",
  },
  PRODUCT_REVIEW: {
    label: "리뷰",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "R",
  },
  PET_SHOWCASE: {
    label: "반려동물 자랑",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "S",
  },
};

export function getPostTypeMeta(type?: string | null): PostTypeMeta {
  if (!type) {
    return FALLBACK_POST_TYPE_META;
  }

  const meta = (postTypeMeta as Partial<Record<string, PostTypeMeta>>)[type];
  return meta ?? FALLBACK_POST_TYPE_META;
}

export function formatRelativeDate(
  date: Date | string | number,
  nowMs: number = Date.now(),
) {
  const targetDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(targetDate.getTime())) {
    return "";
  }

  const diffMs = nowMs - targetDate.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return targetDate.toLocaleDateString("ko-KR");
}

export function formatCount(value?: number | null) {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;

  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safeValue);
}

type PostSignalInput = {
  title?: string | null;
  content?: string | null;
  imageCount?: number | null;
};

export function getPostSignals({
  title,
  content,
  imageCount,
}: PostSignalInput): PostSignal[] {
  const signals: PostSignal[] = [];
  const safeImageCount = Number.isFinite(imageCount) ? Number(imageCount) : 0;
  const text = `${title ?? ""}\n${content ?? ""}`;
  const urls = text.match(URL_REGEX)?.map((url) => url.toLowerCase()) ?? [];

  const hasTwitter = urls.some(
    (url) =>
      url.includes("twitter.com") ||
      url.includes("x.com") ||
      url.includes("t.co/"),
  );
  const hasInstagram = urls.some(
    (url) => url.includes("instagram.com") || url.includes("instagr.am"),
  );

  if (safeImageCount > 0) {
    signals.push("image");
  }

  if (hasTwitter) {
    signals.push("twitter");
  }

  if (hasInstagram) {
    signals.push("instagram");
  }

  if (urls.length > 0 && !hasTwitter && !hasInstagram) {
    signals.push("link");
  }

  return signals;
}
