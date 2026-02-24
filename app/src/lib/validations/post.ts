import { PostScope, PostType } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().min(1).optional(),
);

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
    return value;
  },
  z.coerce.boolean().optional(),
);

const imageUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (value) =>
      value.startsWith("/uploads/") ||
      value.startsWith("https://") ||
      value.startsWith("http://"),
    "이미지 URL 형식이 올바르지 않습니다.",
  );

export const postCreateSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1),
  type: z.nativeEnum(PostType),
  scope: z.nativeEnum(PostScope).default(PostScope.LOCAL),
  neighborhoodId: z.string().cuid().optional(),
  imageUrls: z.array(imageUrlSchema).max(10).optional().default([]),
  guestDisplayName: z.string().trim().min(2).max(24).optional(),
  guestPassword: z.string().min(4).max(32).optional(),
});

export const hospitalReviewSchema = z.object({
  hospitalName: optionalTrimmedString,
  treatmentType: optionalTrimmedString,
  totalCost: optionalInt({ min: 0 }),
  waitTime: optionalInt({ min: 0 }),
  rating: optionalInt({ min: 1, max: 5 }),
});

export const placeReviewSchema = z.object({
  placeName: optionalTrimmedString,
  placeType: optionalTrimmedString,
  address: optionalTrimmedString,
  isPetAllowed: optionalBoolean,
  rating: optionalInt({ min: 1, max: 5 }),
});

export const walkRouteSchema = z.object({
  routeName: optionalTrimmedString,
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

export const postListSchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.nativeEnum(PostType).optional(),
  scope: z.nativeEnum(PostScope).optional(),
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
    title: z.string().min(1).max(120).optional(),
    content: z.string().min(1).optional(),
    scope: z.nativeEnum(PostScope).optional(),
    neighborhoodId: z.string().cuid().optional().nullable(),
    imageUrls: z.array(imageUrlSchema).max(10).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "업데이트할 항목이 필요합니다.",
  });

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostListInput = z.infer<typeof postListSchema>;
export type HospitalReviewInput = z.infer<typeof hospitalReviewSchema>;
export type PlaceReviewInput = z.infer<typeof placeReviewSchema>;
export type WalkRouteInput = z.infer<typeof walkRouteSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
