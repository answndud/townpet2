import { z } from "zod";

const directModerationUserKeySchema = z.string().trim().min(1).max(320);
const directModerationReasonSchema = z.string().trim().min(1).max(500);

export const directUserSanctionSchema = z.object({
  userKey: directModerationUserKeySchema,
  reason: directModerationReasonSchema,
});

export const DIRECT_USER_CONTENT_SCOPE = [
  "LAST_24H",
  "LAST_7D",
  "ALL_ACTIVE",
] as const;

export const directUserContentHideSchema = z.object({
  userKey: directModerationUserKeySchema,
  reason: directModerationReasonSchema,
  scope: z.enum(DIRECT_USER_CONTENT_SCOPE).default("LAST_24H"),
});

export const directUserContentRestoreSchema = z.object({
  userKey: directModerationUserKeySchema,
  reason: directModerationReasonSchema,
  scope: z.enum(DIRECT_USER_CONTENT_SCOPE).default("ALL_ACTIVE"),
});

export const DIRECT_POST_VISIBILITY_ACTION = ["HIDE", "UNHIDE"] as const;

export const directPostVisibilitySchema = z.object({
  action: z.enum(DIRECT_POST_VISIBILITY_ACTION),
  reason: directModerationReasonSchema,
});

export type DirectUserSanctionInput = z.infer<typeof directUserSanctionSchema>;
export type DirectUserContentHideInput = z.infer<typeof directUserContentHideSchema>;
export type DirectUserContentRestoreInput = z.infer<typeof directUserContentRestoreSchema>;
export type DirectUserContentScope = DirectUserContentHideInput["scope"];
export type DirectPostVisibilityInput = z.infer<typeof directPostVisibilitySchema>;

export function getDirectUserContentScopeLabel(scope: DirectUserContentScope) {
  switch (scope) {
    case "LAST_24H":
      return "최근 24시간";
    case "LAST_7D":
      return "최근 7일";
    case "ALL_ACTIVE":
      return "전체 범위";
    default:
      return scope;
  }
}
