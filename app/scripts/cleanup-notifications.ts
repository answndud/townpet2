import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupArchivedNotifications,
  resolveNotificationRetentionDays,
} from "@/server/notification-retention";

const prisma = new PrismaClient();

async function main() {
  const retentionDays = resolveNotificationRetentionDays();
  const result = await cleanupArchivedNotifications({
    delegate: prisma.notification,
    retentionDays,
  });

  console.log(
    `Deleted ${result.count} notifications archived before ${result.cutoff.toISOString()}.`,
  );
}

main()
  .catch((error) => {
    console.error("Notification cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
