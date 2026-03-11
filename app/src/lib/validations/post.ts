import {
  AdoptionStatus,
  AnimalSex,
  PostScope,
  PostType,
  VolunteerRecruitmentStatus,
} from "@prisma/client";
import { z } from "zod";

import {
  isAnimalTagsRequiredCommonBoardPostType,
  isCommonBoardPostType,
} from "@/lib/community-board";
import { POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "@/lib/input-limits";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { REVIEW_CATEGORY, REVIEW_CATEGORY_VALUES, type ReviewCategory } from "@/lib/review-category";
import {
  normalizeAdoptionAgeLabel,
  normalizeAnimalType,
  normalizeHospitalName,
  normalizeHospitalTreatmentType,
  normalizeShelterName,
  normalizeStructuredRegion,
  normalizeStructuredTextValue,
  normalizeVolunteerType,
} from "@/lib/structured-field-normalization";
import { isTrustedUploadUrl } from "@/lib/upload-url";
import {
  optionalNormalizedString,
  optionalTrimmedNonEmptyString,
  optionalTrimmedString,
  trimmedRequiredString,
} from "@/lib/validations/text";

const optionalInt = (options: { min: number; max?: number }) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    options.max !== undefined
      ? z.coerce.number().int().min(options.min).max(options.max).optional()
      : z.coerce.number().int().min(options.min).optional(),
  );

const optionalFloat = (min: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.coerce.number().min(min).optional(),
  );

const optionalBoolean = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }
      if (normalized === "false") {
        return false;
      }
    }
    return value;
  },
  z.coerce.boolean().optional(),
);

const optionalDate = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    return value;
  },
  z.coerce.date().optional(),
);

const optionalNativeEnum = <T extends Record<string, string | number>>(enumObject: T) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.nativeEnum(enumObject).optional(),
  );

const imageUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => isTrustedUploadUrl(value), "허용된 업로드 이미지 URL만 사용할 수 있습니다.");

export const postCreateSchema = z.object({
  title: trimmedRequiredString({ max: POST_TITLE_MAX_LENGTH }),
  content: trimmedRequiredString({ max: POST_CONTENT_MAX_LENGTH }),
  type: z.nativeEnum(PostType),
  scope: z.nativeEnum(PostScope).default(PostScope.LOCAL),
  neighborhoodId: z.string().cuid().optional(),
  petTypeId: z.string().cuid().optional(),
  reviewCategory: z.enum(REVIEW_CATEGORY_VALUES).optional(),
  animalTags: z.array(trimmedRequiredString({ max: 24 })).max(5).optional().default([]),
  imageUrls: z.array(imageUrlSchema).max(10).optional().default([]),
  guestDisplayName: optionalTrimmedString({ min: 2, max: 24 }),
  guestPassword: z.string().min(4).max(32).optional(),
})
  .superRefine((value, ctx) => {
    const isReviewType =
      value.type === PostType.PLACE_REVIEW || value.type === PostType.PRODUCT_REVIEW;

    if (isReviewType && !value.reviewCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewCategory"],
        message: "리뷰 게시글은 세부 카테고리 선택이 필요합니다.",
      });
    }

    if (
      value.type === PostType.PLACE_REVIEW &&
      value.reviewCategory &&
      value.reviewCategory !== REVIEW_CATEGORY.PLACE
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewCategory"],
        message: "장소 리뷰는 장소 카테고리만 선택할 수 있습니다.",
      });
    }

    if (value.type === PostType.PRODUCT_REVIEW && value.reviewCategory === REVIEW_CATEGORY.PLACE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewCategory"],
        message: "용품 리뷰는 장소 카테고리를 선택할 수 없습니다.",
      });
    }

    if (isCommonBoardPostType(value.type)) {
      if (value.petTypeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["petTypeId"],
          message: "공용 보드 글은 반려동물 타입을 지정할 수 없습니다.",
        });
      }

      if (
        isAnimalTagsRequiredCommonBoardPostType(value.type) &&
        (value.animalTags ?? []).length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["animalTags"],
          message: "공용 보드 글은 동물 태그를 최소 1개 입력해 주세요.",
        });
      }

      return;
    }

    if (!isFreeBoardPostType(value.type) && !value.petTypeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["petTypeId"],
        message: "커뮤니티 글은 반려동물 타입 선택이 필요합니다.",
      });
    }
  });

export const hospitalReviewSchema = z.object({
  hospitalName: optionalNormalizedString(normalizeHospitalName),
  treatmentType: optionalNormalizedString(normalizeHospitalTreatmentType),
  totalCost: optionalInt({ min: 0 }),
  waitTime: optionalInt({ min: 0 }),
  rating: optionalInt({ min: 1, max: 5 }),
});

export const placeReviewSchema = z.object({
  placeName: optionalTrimmedString(),
  placeType: optionalTrimmedString(),
  address: optionalTrimmedString(),
  isPetAllowed: optionalBoolean,
  rating: optionalInt({ min: 1, max: 5 }),
});

export const walkRouteSchema = z.object({
  routeName: optionalTrimmedString(),
  distance: optionalFloat(0),
  duration: optionalInt({ min: 0 }),
  difficulty: z
    .preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(["EASY", "MODERATE", "HARD"]).optional(),
    )
    .optional(),
  hasStreetLights: optionalBoolean,
  hasRestroom: optionalBoolean,
  hasParkingLot: optionalBoolean,
  safetyTags: z.array(z.string().min(1)).optional(),
});

export const adoptionListingSchema = z.object({
  shelterName: optionalNormalizedString(normalizeShelterName),
  region: optionalNormalizedString(normalizeStructuredRegion),
  animalType: optionalNormalizedString(normalizeAnimalType),
  breed: optionalNormalizedString(normalizeStructuredTextValue),
  ageLabel: optionalNormalizedString(normalizeAdoptionAgeLabel),
  sex: optionalNativeEnum(AnimalSex),
  isNeutered: optionalBoolean,
  isVaccinated: optionalBoolean,
  sizeLabel: optionalNormalizedString(normalizeStructuredTextValue),
  status: optionalNativeEnum(AdoptionStatus),
});

export const volunteerRecruitmentSchema = z.object({
  shelterName: optionalNormalizedString(normalizeShelterName),
  region: optionalNormalizedString(normalizeStructuredRegion),
  volunteerDate: optionalDate,
  volunteerType: optionalNormalizedString(normalizeVolunteerType),
  capacity: optionalInt({ min: 1, max: 999 }),
  status: optionalNativeEnum(VolunteerRecruitmentStatus),
});

export const postListSchema = z.object({
  cursor: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.nativeEnum(PostType).optional(),
  scope: z.nativeEnum(PostScope).optional(),
  petType: z.string().cuid().optional(),
  review: z.enum(REVIEW_CATEGORY_VALUES).optional(),
  q: z.string().min(1).max(100).optional(),
  searchIn: z.enum(["ALL", "TITLE", "CONTENT", "AUTHOR"]).optional(),
  sort: z.enum(["LATEST", "LIKE", "COMMENT"]).optional(),
  days: z
    .coerce
    .number()
    .int()
    .refine((value) => value === 3 || value === 7 || value === 30, {
      message: "days must be one of 3, 7, 30",
    })
    .optional(),
  personalized: z
    .preprocess((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "1" || normalized === "true") {
          return true;
        }
        if (normalized === "0" || normalized === "false" || normalized.length === 0) {
          return false;
        }
      }
      return value;
    }, z.boolean())
    .optional(),
});

export const postUpdateSchema = z
  .object({
    title: optionalTrimmedNonEmptyString({ max: POST_TITLE_MAX_LENGTH }),
    content: optionalTrimmedNonEmptyString({ max: POST_CONTENT_MAX_LENGTH }),
    scope: z.nativeEnum(PostScope).optional(),
    neighborhoodId: z.string().cuid().optional().nullable(),
    imageUrls: z.array(imageUrlSchema).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "업데이트할 항목이 필요합니다.",
  });

type PostListSchemaInput = z.infer<typeof postListSchema>;

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostListInput = Omit<PostListSchemaInput, "petType" | "review"> & {
  petTypeId?: string;
  reviewCategory?: ReviewCategory;
};
export type HospitalReviewInput = z.infer<typeof hospitalReviewSchema>;
export type PlaceReviewInput = z.infer<typeof placeReviewSchema>;
export type WalkRouteInput = z.infer<typeof walkRouteSchema>;
export type AdoptionListingInput = z.infer<typeof adoptionListingSchema>;
export type VolunteerRecruitmentInput = z.infer<typeof volunteerRecruitmentSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;

// Normalize parsed list input to product-facing naming.
export function toPostListInput(value: PostListSchemaInput): PostListInput {
  const { petType, review, ...rest } = value;
  return {
    ...rest,
    petTypeId: petType,
    reviewCategory: review,
  };
}
