import { prisma } from "@/lib/prisma";

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, nickname: true },
  });
}

export async function listUsersByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, name: true, nickname: true },
  });
}
