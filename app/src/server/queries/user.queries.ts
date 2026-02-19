import { prisma } from "@/lib/prisma";

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, nickname: true, image: true, role: true },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, nickname: true, image: true, role: true },
  });
}

export async function getUserWithNeighborhoods(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      image: true,
      neighborhoods: {
        select: {
          id: true,
          isPrimary: true,
          neighborhood: {
            select: { id: true, name: true, city: true, district: true },
          },
        },
      },
    },
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
