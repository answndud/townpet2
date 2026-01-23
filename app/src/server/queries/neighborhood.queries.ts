import { prisma } from "@/lib/prisma";

export async function listNeighborhoods() {
  return prisma.neighborhood.findMany({
    orderBy: [{ city: "asc" }, { district: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
    },
  });
}
