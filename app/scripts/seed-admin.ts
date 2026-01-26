import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEFAULT_PASSWORD is required.");
  }
  const passwordHash = await hashPassword(seedPassword);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: UserRole.ADMIN },
    create: {
      email,
      name: "TownPet Admin",
      nickname: "townpet-admin",
      role: UserRole.ADMIN,
      passwordHash,
      emailVerified: new Date(),
    },
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error("Seed admin failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
