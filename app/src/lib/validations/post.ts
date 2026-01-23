import { PostScope, PostType } from "@prisma/client";
import { z } from "zod";

export const postCreateSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1),
  type: z.nativeEnum(PostType),
  scope: z.nativeEnum(PostScope).default(PostScope.LOCAL),
  neighborhoodId: z.string().cuid().optional(),
});

export const hospitalReviewSchema = z.object({
  hospitalName: z.string().min(1),
  visitDate: z.string().min(1),
  treatmentType: z.string().min(1),
  totalCost: z.coerce.number().int().min(0).optional(),
  waitTime: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().int().min(1).max(5),
});

export const placeReviewSchema = z.object({
  placeName: z.string().min(1),
  placeType: z.string().min(1),
  address: z.string().min(1).optional(),
  isPetAllowed: z.coerce.boolean().default(true),
  rating: z.coerce.number().int().min(1).max(5),
});

export const walkRouteSchema = z.object({
  routeName: z.string().min(1),
  distance: z.coerce.number().min(0).optional(),
  duration: z.coerce.number().int().min(0).optional(),
  difficulty: z.enum(["EASY", "MODERATE", "HARD"]).default("EASY"),
  hasStreetLights: z.coerce.boolean().default(false),
  hasRestroom: z.coerce.boolean().default(false),
  hasParkingLot: z.coerce.boolean().default(false),
  safetyTags: z.array(z.string().min(1)).default([]),
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
