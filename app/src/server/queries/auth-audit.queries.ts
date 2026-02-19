import { AuthAuditAction } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuthAuditListOptions = {
  action?: AuthAuditAction | null;
  query?: string | null;
  limit?: number;
};

export async function listAuthAuditLogs({
  action,
  query,
  limit,
}: AuthAuditListOptions) {
  const trimmedQuery = query?.trim();
  const safeLimit = Math.min(Math.max(limit ?? 50, 1), 200);

  return prisma.authAuditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              { userId: { contains: trimmedQuery, mode: "insensitive" } },
              { ipAddress: { contains: trimmedQuery, mode: "insensitive" } },
              { userAgent: { contains: trimmedQuery, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { email: { contains: trimmedQuery, mode: "insensitive" } },
                    { nickname: { contains: trimmedQuery, mode: "insensitive" } },
                    { name: { contains: trimmedQuery, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    include: {
      user: { select: { id: true, email: true, nickname: true, name: true } },
    },
  });
}
