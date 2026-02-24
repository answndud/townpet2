import { PostType } from "@prisma/client";
import { z } from "zod";

const LOUNGE_ALLOWED_TYPES: ReadonlyArray<PostType> = [
  PostType.QA_QUESTION,
  PostType.HOSPITAL_REVIEW,
  PostType.PLACE_REVIEW,
  PostType.WALK_ROUTE,
  PostType.MARKET_LISTING,
  PostType.PRODUCT_REVIEW,
  PostType.PET_SHOWCASE,
  PostType.FREE_BOARD,
];

export const breedCodeParamSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((value) => value.toUpperCase());

export const breedLoungePostListSchema = z.object({
  cursor: z.string().cuid().optional(),
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
  type: z
    .nativeEnum(PostType)
    .refine((value) => LOUNGE_ALLOWED_TYPES.includes(value), {
      message: "선택할 수 없는 라운지 카테고리입니다.",
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

export const breedLoungeGroupBuyCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1),
  productName: z.string().trim().min(1).max(120),
  targetPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  minParticipants: z.coerce.number().int().min(2).max(500).optional(),
  purchaseDeadline: z.string().trim().min(1).max(60).optional(),
  deliveryMethod: z.string().trim().min(1).max(120).optional(),
  imageUrls: z.array(z.string().trim().min(1).max(2048)).max(10).optional(),
  guestDisplayName: z.string().trim().min(2).max(24).optional(),
  guestPassword: z.string().min(4).max(32).optional(),
});

export type BreedLoungePostListInput = z.infer<typeof breedLoungePostListSchema>;
export type BreedLoungeGroupBuyCreateInput = z.infer<typeof breedLoungeGroupBuyCreateSchema>;
