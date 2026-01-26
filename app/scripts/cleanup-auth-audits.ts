import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const retentionDays = Number(process.env.AUTH_AUDIT_RETENTION_DAYS ?? "180");
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error("AUTH_AUDIT_RETENTION_DAYS must be a positive number.");
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.authAuditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  console.log(`Deleted ${result.count} auth audit logs older than ${retentionDays} days.`);
}

main()
  .catch((error) => {
    console.error("Auth audit cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
