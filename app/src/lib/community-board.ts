import type { BoardScope, CommonBoardType, PostType } from "@prisma/client";

const BOARD_SCOPE = {
  COMMON: "COMMON",
  COMMUNITY: "COMMUNITY",
} as const satisfies Record<BoardScope, BoardScope>;

const COMMON_BOARD_TYPE = {
  HOSPITAL: "HOSPITAL",
  LOST_FOUND: "LOST_FOUND",
  MARKET: "MARKET",
  ADOPTION: "ADOPTION",
  VOLUNTEER: "VOLUNTEER",
} as const satisfies Record<CommonBoardType, CommonBoardType>;

export const COMMON_BOARD_POST_TYPES = [
  "HOSPITAL_REVIEW",
  "LOST_FOUND",
  "MARKET_LISTING",
  "ADOPTION_LISTING",
  "SHELTER_VOLUNTEER",
] as const;

export const COMMON_BOARD_TYPE_BY_POST_TYPE: Record<
  (typeof COMMON_BOARD_POST_TYPES)[number],
  CommonBoardType
> = {
  HOSPITAL_REVIEW: COMMON_BOARD_TYPE.HOSPITAL,
  LOST_FOUND: COMMON_BOARD_TYPE.LOST_FOUND,
  MARKET_LISTING: COMMON_BOARD_TYPE.MARKET,
  ADOPTION_LISTING: COMMON_BOARD_TYPE.ADOPTION,
  SHELTER_VOLUNTEER: COMMON_BOARD_TYPE.VOLUNTEER,
};

const DEDICATED_BOARD_PATH_BY_POST_TYPE: Partial<Record<PostType, string>> = {
  ADOPTION_LISTING: "/boards/adoption",
};

type CommonBoardPostType = keyof typeof COMMON_BOARD_TYPE_BY_POST_TYPE;

export function isCommonBoardPostType(type: PostType): type is CommonBoardPostType {
  return Object.prototype.hasOwnProperty.call(COMMON_BOARD_TYPE_BY_POST_TYPE, type);
}

export function resolveBoardByPostType(type: PostType) {
  if (isCommonBoardPostType(type)) {
    return {
      boardScope: BOARD_SCOPE.COMMON,
      commonBoardType: COMMON_BOARD_TYPE_BY_POST_TYPE[type],
    } as const;
  }

  return {
    boardScope: BOARD_SCOPE.COMMUNITY,
    commonBoardType: null,
  } as const;
}

export function isAnimalTagsRequiredCommonBoardPostType(type: PostType) {
  return type === "HOSPITAL_REVIEW";
}

export function getDedicatedBoardPathByPostType(type?: PostType | null) {
  if (!type) {
    return null;
  }

  return DEDICATED_BOARD_PATH_BY_POST_TYPE[type] ?? null;
}
