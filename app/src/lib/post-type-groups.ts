import { PostType } from "@prisma/client";

export const PRIMARY_POST_TYPES: PostType[] = [
  PostType.FREE_BOARD,
  PostType.QA_QUESTION,
  PostType.HOSPITAL_REVIEW,
  PostType.PLACE_REVIEW,
  PostType.WALK_ROUTE,
  PostType.LOST_FOUND,
  PostType.MEETUP,
  PostType.MARKET_LISTING,
  PostType.ADOPTION_LISTING,
  PostType.SHELTER_VOLUNTEER,
];

export const SECONDARY_POST_TYPES: PostType[] = [
  PostType.PRODUCT_REVIEW,
  PostType.PET_SHOWCASE,
];

export const FILTERABLE_POST_TYPES: PostType[] = [
  ...PRIMARY_POST_TYPES,
  ...SECONDARY_POST_TYPES,
];

export const FREE_BOARD_POST_TYPES: ReadonlyArray<PostType> = [
  PostType.FREE_BOARD,
  PostType.FREE_POST,
  PostType.DAILY_SHARE,
];

const POST_TYPE_GROUPS: ReadonlyArray<ReadonlyArray<PostType>> = [
  [PostType.FREE_BOARD, PostType.FREE_POST, PostType.DAILY_SHARE],
  [PostType.QA_QUESTION, PostType.QA_ANSWER],
  [PostType.HOSPITAL_REVIEW],
  [PostType.PLACE_REVIEW, PostType.PRODUCT_REVIEW],
  [PostType.WALK_ROUTE],
  [PostType.MEETUP],
  [PostType.MARKET_LISTING],
  [PostType.ADOPTION_LISTING],
  [PostType.SHELTER_VOLUNTEER],
  [PostType.LOST_FOUND],
  [PostType.PET_SHOWCASE],
];

export function getEquivalentPostTypes(type: PostType): PostType[] {
  const grouped = POST_TYPE_GROUPS.find((group) => group.includes(type));
  return grouped ? [...grouped] : [type];
}

export function isFreeBoardPostType(type: PostType) {
  return FREE_BOARD_POST_TYPES.includes(type);
}

export function expandExcludedPostTypes(types: PostType[]): PostType[] {
  const expanded = new Set<PostType>();
  for (const type of types) {
    for (const equivalent of getEquivalentPostTypes(type)) {
      expanded.add(equivalent);
    }
  }
  return [...expanded];
}
