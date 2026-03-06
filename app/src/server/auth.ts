import { UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import {
  getUserByEmail,
  getUserById,
  getUserRoleByEmail,
  getUserRoleById,
} from "@/server/queries/user.queries";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";

const SESSION_COOKIE_NAMES = [
  "townpet.session-token",
  "__Secure-townpet.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

export function hasSessionCookieFromRequest(request: Pick<Request, "headers">) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return false;
  }

  return SESSION_COOKIE_NAMES.some((name) =>
    cookieHeader.includes(`${name}=`),
  );
}

export async function getCurrentUserId() {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  const demoEmail = process.env.DEMO_USER_EMAIL;
  if (demoEmail && process.env.NODE_ENV !== "production") {
    const demoUser = await getUserByEmail(demoEmail);
    return demoUser?.id ?? null;
  }

  return null;
}

export async function requireAuthenticatedUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new ServiceError("로그인이 필요합니다.", "AUTH_REQUIRED", 401);
  }

  return userId;
}

export async function getCurrentUserRole() {
  const session = await auth();
  if (session?.user?.id) {
    return getUserRoleById(session.user.id);
  }

  const demoEmail = process.env.DEMO_USER_EMAIL;
  if (demoEmail && process.env.NODE_ENV !== "production") {
    return getUserRoleByEmail(demoEmail);
  }

  return null;
}

export async function requireModeratorUserId() {
  const user = await getCurrentUserRole();
  if (!user) {
    throw new ServiceError("로그인이 필요합니다.", "AUTH_REQUIRED", 401);
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
    throw new ServiceError("권한이 없습니다.", "FORBIDDEN", 403);
  }

  return user.id;
}

export async function getCurrentUser() {
  const session = await auth();
  if (session?.user?.id) {
    return getUserById(session.user.id);
  }

  const demoEmail = process.env.DEMO_USER_EMAIL;
  if (demoEmail && process.env.NODE_ENV !== "production") {
    return getUserByEmail(demoEmail);
  }

  return null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError("로그인이 필요합니다.", "AUTH_REQUIRED", 401);
  }

  if (user.role === UserRole.USER) {
    await assertUserInteractionAllowed(user.id);
  }

  return user;
}

export async function requireModerator() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
    throw new ServiceError("권한이 없습니다.", "FORBIDDEN", 403);
  }

  return user;
}
