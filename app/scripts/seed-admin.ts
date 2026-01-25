import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: UserRole.ADMIN },
    create: {
      email,
      name: "TownPet Admin",
      nickname: "townpet-admin",
      role: UserRole.ADMIN,
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
