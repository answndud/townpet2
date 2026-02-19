import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

const neighborhoodSeeds = [
  { name: "서초동", city: "서울", district: "서초구" },
  { name: "연남동", city: "서울", district: "마포구" },
  { name: "망원동", city: "서울", district: "마포구" },
  { name: "수영동", city: "부산", district: "수영구" },
  { name: "광안동", city: "부산", district: "수영구" },
  { name: "중앙동", city: "대구", district: "중구" },
  { name: "탄방동", city: "대전", district: "서구" },
  { name: "정자동", city: "성남", district: "분당구" },
];

const neighborhoodKey = (city: string, district: string, name: string) =>
  `${city}|${district}|${name}`;

type SeedUser = {
  email: string;
  name: string;
  nickname?: string | null;
  role: UserRole;
  verified: boolean;
  withPassword: boolean;
  primaryNeighborhood?: string;
  secondaryNeighborhoods?: string[];
  imageSeed: string;
};

const seedUsers: SeedUser[] = [
  {
    email: "admin.platform@townpet.dev",
    name: "Platform Admin",
    nickname: "platform-admin",
    role: UserRole.ADMIN,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "서초구", "서초동"),
    secondaryNeighborhoods: [neighborhoodKey("성남", "분당구", "정자동")],
    imageSeed: "admin-platform",
  },
  {
    email: "admin.ops@townpet.dev",
    name: "Ops Admin",
    nickname: "ops-admin",
    role: UserRole.ADMIN,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("부산", "수영구", "수영동"),
    imageSeed: "admin-ops",
  },
  {
    email: "mod.trust@townpet.dev",
    name: "Trust Moderator",
    nickname: "trust-mod",
    role: UserRole.MODERATOR,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "마포구", "연남동"),
    secondaryNeighborhoods: [neighborhoodKey("서울", "마포구", "망원동")],
    imageSeed: "mod-trust",
  },
  {
    email: "mod.local@townpet.dev",
    name: "Local Moderator",
    nickname: "local-mod",
    role: UserRole.MODERATOR,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("부산", "수영구", "광안동"),
    imageSeed: "mod-local",
  },
  {
    email: "mod.content@townpet.dev",
    name: "Content Moderator",
    nickname: "content-mod",
    role: UserRole.MODERATOR,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("대구", "중구", "중앙동"),
    imageSeed: "mod-content",
  },
  {
    email: "power.reviewer@townpet.dev",
    name: "Power Reviewer",
    nickname: "review-pro",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "서초구", "서초동"),
    secondaryNeighborhoods: [neighborhoodKey("서울", "마포구", "연남동")],
    imageSeed: "power-reviewer",
  },
  {
    email: "hospital.geek@townpet.dev",
    name: "Hospital Geek",
    nickname: "vet-notes",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("성남", "분당구", "정자동"),
    imageSeed: "hospital-geek",
  },
  {
    email: "place.hunter@townpet.dev",
    name: "Place Hunter",
    nickname: "pet-place-hunter",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "마포구", "망원동"),
    imageSeed: "place-hunter",
  },
  {
    email: "route.runner@townpet.dev",
    name: "Route Runner",
    nickname: "walk-route-runner",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("부산", "수영구", "광안동"),
    imageSeed: "route-runner",
  },
  {
    email: "qa.helper@townpet.dev",
    name: "QA Helper",
    nickname: "qa-helper",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("대전", "서구", "탄방동"),
    imageSeed: "qa-helper",
  },
  {
    email: "lostfound.alert@townpet.dev",
    name: "Lost and Found Watcher",
    nickname: "lostfound-watch",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("부산", "수영구", "수영동"),
    imageSeed: "lostfound-alert",
  },
  {
    email: "newbie.day1@townpet.dev",
    name: "Newbie Day1",
    nickname: "newbie-day1",
    role: UserRole.USER,
    verified: false,
    withPassword: false,
    imageSeed: "newbie-day1",
  },
  {
    email: "newbie.week1@townpet.dev",
    name: "Newbie Week1",
    nickname: "newbie-week1",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "마포구", "연남동"),
    imageSeed: "newbie-week1",
  },
  {
    email: "quiet.reader@townpet.dev",
    name: "Quiet Reader",
    nickname: null,
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("대구", "중구", "중앙동"),
    imageSeed: "quiet-reader",
  },
  {
    email: "cat.parent@townpet.dev",
    name: "Cat Parent",
    nickname: "cat-mom",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "마포구", "망원동"),
    imageSeed: "cat-parent",
  },
  {
    email: "dog.parent@townpet.dev",
    name: "Dog Parent",
    nickname: "dog-dad",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("성남", "분당구", "정자동"),
    imageSeed: "dog-parent",
  },
  {
    email: "multi.pet.family@townpet.dev",
    name: "Multi Pet Family",
    nickname: "family-pack",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("대전", "서구", "탄방동"),
    secondaryNeighborhoods: [neighborhoodKey("서울", "서초구", "서초동")],
    imageSeed: "multi-pet-family",
  },
  {
    email: "weekend.meetup@townpet.dev",
    name: "Weekend Meetup Host",
    nickname: "weekend-meetup",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "서초구", "서초동"),
    imageSeed: "weekend-meetup",
  },
  {
    email: "market.scout@townpet.dev",
    name: "Market Scout",
    nickname: "market-scout",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("부산", "수영구", "수영동"),
    imageSeed: "market-scout",
  },
  {
    email: "care.requester@townpet.dev",
    name: "Care Requester",
    nickname: "care-requester",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("대구", "중구", "중앙동"),
    imageSeed: "care-requester",
  },
  {
    email: "care.helper@townpet.dev",
    name: "Care Helper",
    nickname: "care-helper",
    role: UserRole.USER,
    verified: true,
    withPassword: true,
    primaryNeighborhood: neighborhoodKey("서울", "마포구", "연남동"),
    imageSeed: "care-helper",
  },
];

async function main() {
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEFAULT_PASSWORD is required.");
  }
  const passwordHash = await hashPassword(seedPassword);

  const neighborhoodIds = new Map<string, string>();
  for (const neighborhood of neighborhoodSeeds) {
    const saved = await prisma.neighborhood.upsert({
      where: {
        name_city_district: {
          name: neighborhood.name,
          city: neighborhood.city,
          district: neighborhood.district,
        },
      },
      update: {},
      create: neighborhood,
      select: { id: true, name: true, city: true, district: true },
    });
    neighborhoodIds.set(
      neighborhoodKey(saved.city, saved.district, saved.name),
      saved.id,
    );
  }

  for (const user of seedUsers) {
    const account = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        nickname: user.nickname ?? null,
        role: user.role,
        emailVerified: user.verified ? new Date() : null,
        passwordHash: user.withPassword ? passwordHash : null,
        image: `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(user.imageSeed)}`,
      },
      create: {
        email: user.email,
        name: user.name,
        nickname: user.nickname ?? null,
        role: user.role,
        passwordHash: user.withPassword ? passwordHash : null,
        emailVerified: user.verified ? new Date() : null,
        image: `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(user.imageSeed)}`,
      },
      select: { id: true, email: true, role: true },
    });

    const assignedNeighborhoodIds: string[] = [];
    if (user.primaryNeighborhood) {
      const orderedKeys = [
        user.primaryNeighborhood,
        ...(user.secondaryNeighborhoods ?? []),
      ];

      await prisma.userNeighborhood.updateMany({
        where: { userId: account.id },
        data: { isPrimary: false },
      });

      for (const [index, key] of orderedKeys.entries()) {
        const neighborhoodId = neighborhoodIds.get(key);
        if (!neighborhoodId) {
          continue;
        }
        assignedNeighborhoodIds.push(neighborhoodId);
        await prisma.userNeighborhood.upsert({
          where: {
            userId_neighborhoodId: {
              userId: account.id,
              neighborhoodId,
            },
          },
          update: { isPrimary: index === 0 },
          create: {
            userId: account.id,
            neighborhoodId,
            isPrimary: index === 0,
          },
        });
      }
    }

    if (assignedNeighborhoodIds.length > 0) {
      await prisma.userNeighborhood.deleteMany({
        where: {
          userId: account.id,
          neighborhoodId: { notIn: assignedNeighborhoodIds },
        },
      });
    } else {
      await prisma.userNeighborhood.deleteMany({
        where: { userId: account.id },
      });
    }
  }

  const roleSummary = seedUsers.reduce<Record<UserRole, number>>(
    (acc, user) => {
      acc[user.role] += 1;
      return acc;
    },
    { USER: 0, MODERATOR: 0, ADMIN: 0 },
  );

  const verifiedCount = seedUsers.filter((user) => user.verified).length;
  const unverifiedCount = seedUsers.length - verifiedCount;
  const noNeighborhoodCount = seedUsers.filter(
    (user) => !user.primaryNeighborhood,
  ).length;

  console.log("Seed users ready.");
  console.log(
    `- total=${seedUsers.length}, admin=${roleSummary.ADMIN}, moderator=${roleSummary.MODERATOR}, user=${roleSummary.USER}`,
  );
  console.log(
    `- verified=${verifiedCount}, unverified=${unverifiedCount}, no-neighborhood=${noNeighborhoodCount}`,
  );
  console.log(`- default password users: ${seedUsers.filter((user) => user.withPassword).length}`);
  console.log("Sample accounts:");
  for (const user of seedUsers.slice(0, 6)) {
    console.log(`- ${user.email} (${user.role})`);
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
