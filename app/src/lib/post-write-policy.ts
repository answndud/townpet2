import { PostType, UserRole } from "@prisma/client";

import {
  DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS,
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES,
} from "@/lib/new-user-safety-policy";

export const NEW_USER_RESTRICTION_HOURS = DEFAULT_NEW_USER_MIN_ACCOUNT_AGE_HOURS;

export const NEW_USER_RESTRICTED_POST_TYPES: ReadonlyArray<PostType> =
  DEFAULT_NEW_USER_RESTRICTED_POST_TYPES;

const restrictedTypeLabels: Record<PostType, string> = {
  HOSPITAL_REVIEW: "병원후기",
  PLACE_REVIEW: "장소후기",
  WALK_ROUTE: "산책코스",
  MEETUP: "동네모임",
  MARKET_LISTING: "중고/공동구매",
  LOST_FOUND: "실종/목격 제보",
  QA_QUESTION: "질문/답변",
  QA_ANSWER: "질문/답변",
  FREE_POST: "자유게시판",
  FREE_BOARD: "자유게시판",
  DAILY_SHARE: "자유게시판",
  PRODUCT_REVIEW: "용품리뷰",
  PET_SHOWCASE: "반려자랑",
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
