import { redirect } from "next/navigation";

import { shouldRedirectToProfileForNicknameGuard } from "@/lib/nickname-guard";

export function redirectToProfileIfNicknameMissing(params: {
  isAuthenticated: boolean;
  nickname?: string | null;
}) {
  if (shouldRedirectToProfileForNicknameGuard(params)) {
    redirect("/profile");
  }
}
