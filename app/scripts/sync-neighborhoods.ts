import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

type NeighborhoodSeed = {
  name: string;
  city: string;
  district: string;
};

const prisma = new PrismaClient();
const CHUNK_SIZE = 500;
const CHUNK_RETRY_MAX = 3;
const CHUNK_RETRY_DELAY_MS = 1500;

function isTransientDbError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1003", "P1011"].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  return false;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const existingCount = await prisma.neighborhood.count().catch(() => 0);
  if (existingCount > 0) {
    console.log(`[sync-neighborhoods] already seeded (${existingCount} rows)`);
    return;
  }

  const seeds = await loadNeighborhoodSeeds();
  if (seeds.length === 0) {
    throw new Error("Neighborhood seed data is empty.");
  }

  for (let index = 0; index < seeds.length; index += CHUNK_SIZE) {
    const chunk = seeds.slice(index, index + CHUNK_SIZE);
    for (let attempt = 1; attempt <= CHUNK_RETRY_MAX; attempt += 1) {
      try {
        await prisma.neighborhood.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        break;
      } catch (error) {
        if (isTransientDbError(error) && attempt < CHUNK_RETRY_MAX) {
          console.warn(
            `[sync-neighborhoods] transient error on chunk ${index}-${index + chunk.length}. Retry ${attempt}/${CHUNK_RETRY_MAX}`,
          );
          await sleep(CHUNK_RETRY_DELAY_MS * attempt);
          continue;
        }
        throw error;
      }
    }
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
