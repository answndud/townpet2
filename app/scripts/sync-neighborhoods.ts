import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

type NeighborhoodSeed = {
  name: string;
  city: string;
  district: string;
};

const prisma = new PrismaClient();
const CHUNK_SIZE = 500;

async function loadNeighborhoodSeeds() {
  const filePath = path.join(process.cwd(), "scripts", "data", "korean-neighborhoods.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as NeighborhoodSeed[];

  return parsed
    .map((item) => ({
      name: item.name.trim(),
      city: item.city.trim(),
      district: item.district.trim(),
    }))
    .filter(
      (item) =>
        item.name.length > 0 &&
        item.city.length > 0 &&
        item.district.length > 0,
    );
}

async function main() {
  const seeds = await loadNeighborhoodSeeds();
  if (seeds.length === 0) {
    throw new Error("Neighborhood seed data is empty.");
  }

  for (let index = 0; index < seeds.length; index += CHUNK_SIZE) {
    const chunk = seeds.slice(index, index + CHUNK_SIZE);
    await prisma.neighborhood.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  console.log(`[sync-neighborhoods] processed ${seeds.length} rows`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
