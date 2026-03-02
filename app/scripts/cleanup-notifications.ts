import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const retentionDays = Number(process.env.NOTIFICATION_RETENTION_DAYS ?? "3");
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error("NOTIFICATION_RETENTION_DAYS must be a positive number.");
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let result: { count: number };
  try {
    result = await prisma.notification.deleteMany({
      where: {
        archivedAt: {
          lt: cutoff,
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      console.log("Notification archive column/table is missing. Skipping cleanup run.");
      return;
    }
    throw error;
  }

  console.log(`Deleted ${result.count} notifications archived before ${cutoff.toISOString()}.`);
}

main()
  .catch((error) => {
    console.error("Notification cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
