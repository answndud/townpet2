import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  cleanupTemporaryUploadAssets,
  resolveUploadTemporaryRetentionHours,
} from "../src/server/upload-asset.service";

async function main() {
  const retentionHours = resolveUploadTemporaryRetentionHours();
  const limit = Number(process.env.UPLOAD_TEMP_CLEANUP_LIMIT ?? 100);

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("UPLOAD_TEMP_CLEANUP_LIMIT must be a positive number.");
  }

  const result = await cleanupTemporaryUploadAssets({
    retentionHours,
    limit,
  });

  console.log("Upload asset cleanup");
  console.log(`- retentionHours: ${retentionHours}`);
  console.log(`- scanned: ${result.scannedCount}`);
  console.log(`- deleted: ${result.deletedCount}`);
  console.log(`- skipped: ${result.skippedCount}`);
  console.log(`- cutoff: ${result.cutoff.toISOString()}`);
}

main()
  .catch((error) => {
    console.error("Upload asset cleanup failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
