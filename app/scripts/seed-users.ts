import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

const seedUsers = [
  { email: "user1@townpet.dev", name: "TownPet User One", nickname: "tp-user-1" },
  { email: "user2@townpet.dev", name: "TownPet User Two", nickname: "tp-user-2" },
  { email: "user3@townpet.dev", name: "TownPet User Three", nickname: "tp-user-3" },
];

async function main() {
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEFAULT_PASSWORD is required.");
  }
  const passwordHash = await hashPassword(seedPassword);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, nickname: user.nickname },
      create: {
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        passwordHash,
        emailVerified: new Date(),
      },
    });
  }

  console.log("Seed users ready:");
  for (const user of seedUsers) {
    console.log(`- ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error("Seed users failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
