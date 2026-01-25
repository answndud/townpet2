import { UserRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getUserByEmail, getUserById } from "@/server/queries/user.queries";
import { ServiceError } from "@/server/services/service-error";

export async function getCurrentUser() {
  const session = await auth();
  if (session?.user?.id) {
    return getUserById(session.user.id);
  }

  const demoEmail = process.env.DEMO_USER_EMAIL;
  if (demoEmail) {
    return getUserByEmail(demoEmail);
  }

  return null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ServiceError("로그인이 필요합니다.", "AUTH_REQUIRED", 401);
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
