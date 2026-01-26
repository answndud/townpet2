import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEFAULT_PASSWORD is required.");
  }
  const passwordHash = await hashPassword(seedPassword);
  const result = await prisma.user.updateMany({
    where: { passwordHash: null },
    data: { passwordHash },
  });

  console.log(`Updated ${result.count} users with dummy password.`);
}

main()
  .catch((error) => {
    console.error("Seed passwords failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
