import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seedUsers = [
  { email: "user1@townpet.dev", name: "TownPet User One", nickname: "tp-user-1" },
  { email: "user2@townpet.dev", name: "TownPet User Two", nickname: "tp-user-2" },
  { email: "user3@townpet.dev", name: "TownPet User Three", nickname: "tp-user-3" },
];

async function main() {
  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, nickname: user.nickname },
      create: {
        email: user.email,
        name: user.name,
        nickname: user.nickname,
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
