import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupSearchTermStats,
  resolveSearchTermRetentionDays,
} from "@/server/search-term-stat-retention";

const prisma = new PrismaClient();

async function main() {
  const retentionDays = resolveSearchTermRetentionDays();
  const result = await cleanupSearchTermStats({
    delegate: prisma.searchTermStat,
    retentionDays,
  });

  console.log(
    `Deleted ${result.count} SearchTermStat rows last updated before ${result.cutoff.toISOString()}.`,
  );
}

main()
  .catch((error) => {
    console.error("Search term cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
