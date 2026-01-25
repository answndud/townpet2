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

export const postCreateSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1),
  type: z.nativeEnum(PostType),
  scope: z.nativeEnum(PostScope).default(PostScope.LOCAL),
  neighborhoodId: z.string().cuid().optional(),
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
});

export const postUpdateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    content: z.string().min(1).optional(),
    scope: z.nativeEnum(PostScope).optional(),
    neighborhoodId: z.string().cuid().optional().nullable(),
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
