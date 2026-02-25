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

type SearchNeighborhoodsParams = {
  q?: string;
  city?: string;
  district?: string;
  limit?: number;
};

export async function searchNeighborhoods({
  q,
  city,
  district,
  limit = 200,
}: SearchNeighborhoodsParams) {
  const trimmedQ = q?.trim();
  const trimmedCity = city?.trim();
  const trimmedDistrict = district?.trim();

  return prisma.neighborhood.findMany({
    where: {
      city: trimmedCity || undefined,
      district: trimmedDistrict || undefined,
      OR: trimmedQ
        ? [
            { name: { contains: trimmedQ } },
            { district: { contains: trimmedQ } },
            { city: { contains: trimmedQ } },
          ]
        : undefined,
    },
    orderBy: [{ city: "asc" }, { district: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      district: true,
    },
    take: Math.min(Math.max(limit, 1), 300),
  });
}

export async function listNeighborhoodCities() {
  const rows = await prisma.neighborhood.groupBy({
    by: ["city"],
    orderBy: [{ city: "asc" }],
  });

  return rows.map((row) => row.city);
}

export async function listNeighborhoodDistricts(city?: string) {
  const trimmedCity = city?.trim();
  if (!trimmedCity) {
    return [] as string[];
  }

  const rows = await prisma.neighborhood.groupBy({
    by: ["district"],
    where: { city: trimmedCity },
    orderBy: [{ district: "asc" }],
  });

  return rows.map((row) => row.district);
}
