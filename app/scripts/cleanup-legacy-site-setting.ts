import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LEGACY_SITE_SETTING_KEYS = ["popular_search_terms_v1"] as const;

function hasApplyFlag() {
  return process.argv.includes("--apply");
}

async function main() {
  const apply = hasApplyFlag();
  const keys = [...LEGACY_SITE_SETTING_KEYS];

  const legacyRows = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, updatedAt: true },
    orderBy: { key: "asc" },
  });

  if (legacyRows.length === 0) {
    console.log("No legacy SiteSetting keys found.");
    return;
  }

  console.log(`Found ${legacyRows.length} legacy SiteSetting key(s):`);
  for (const row of legacyRows) {
    console.log(`- ${row.key} (updatedAt=${row.updatedAt.toISOString()})`);
  }

  if (!apply) {
    console.log("Dry-run mode. Re-run with --apply to delete keys.");
    return;
  }

  const deleted = await prisma.siteSetting.deleteMany({
    where: { key: { in: keys } },
  });

  console.log(`Deleted ${deleted.count} legacy SiteSetting key(s).`);
}

main()
  .catch((error) => {
    console.error("Legacy SiteSetting cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
