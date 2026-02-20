import { PostType, UserRole } from "@prisma/client";

import {
  DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES,
} from "@/lib/new-user-safety-policy";

export const NEW_USER_RESTRICTION_HOURS = DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS;

export const NEW_USER_RESTRICTED_POST_TYPES: ReadonlyArray<PostType> =
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES;

const restrictedTypeLabels: Record<PostType, string> = {
  HOSPITAL_REVIEW: "병원 리뷰",
  PLACE_REVIEW: "장소 리뷰",
  WALK_ROUTE: "산책로",
  MEETUP: "번개",
  MARKET_LISTING: "마켓",
  LOST_FOUND: "실종/발견",
  QA_QUESTION: "질문",
  QA_ANSWER: "답변",
  FREE_POST: "자유",
  FREE_BOARD: "자유게시판",
  DAILY_SHARE: "일상공유",
  PRODUCT_REVIEW: "제품리뷰",
  PET_SHOWCASE: "반려동물 자랑",
};

type EvaluateNewUserPostWritePolicyParams = {
  role: UserRole;
  accountCreatedAt: Date;
  postType: PostType;
  now?: Date;
  minAccountAgeHours?: number;
  restrictedTypes?: ReadonlyArray<PostType>;
};

type EvaluateNewUserPostWritePolicyResult = {
  allowed: boolean;
  remainingHours: number;
  message: string | null;
};

export function evaluateNewUserPostWritePolicy({
  role,
  accountCreatedAt,
  postType,
  now = new Date(),
  minAccountAgeHours = NEW_USER_RESTRICTION_HOURS,
  restrictedTypes = NEW_USER_RESTRICTED_POST_TYPES,
}: EvaluateNewUserPostWritePolicyParams): EvaluateNewUserPostWritePolicyResult {
  if (role !== UserRole.USER) {
    return { allowed: true, remainingHours: 0, message: null };
  }

  if (!new Set(restrictedTypes).has(postType)) {
    return { allowed: true, remainingHours: 0, message: null };
  }

  const ageMs = now.getTime() - accountCreatedAt.getTime();
  const minAgeMs = minAccountAgeHours * 60 * 60 * 1000;
  if (ageMs >= minAgeMs) {
    return { allowed: true, remainingHours: 0, message: null };
  }

  const remainingMs = Math.max(0, minAgeMs - ageMs);
  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
  const message = `가입 후 ${minAccountAgeHours}시간 이내에는 ${restrictedTypeLabels[postType]} 카테고리 글을 작성할 수 없습니다. 약 ${remainingHours}시간 후 다시 시도해 주세요.`;

  return { allowed: false, remainingHours, message };
}
