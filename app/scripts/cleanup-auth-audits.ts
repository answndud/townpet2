import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupAuthAuditLogs,
  resolveAuthAuditRetentionDays,
} from "@/server/auth-audit-retention";

const prisma = new PrismaClient();

async function main() {
  const retentionDays = resolveAuthAuditRetentionDays();
  const result = await cleanupAuthAuditLogs({
    delegate: prisma.authAuditLog,
    retentionDays,
  });

  console.log(
    `Deleted ${result.count} auth audit logs older than ${retentionDays} days (cutoff: ${result.cutoff.toISOString()}).`,
  );
}

main()
  .catch((error) => {
    console.error("Auth audit cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
