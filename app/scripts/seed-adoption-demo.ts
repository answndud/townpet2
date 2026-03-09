import "dotenv/config";
import {
  CommonBoardType,
  PostScope,
  PostType,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = "adoption-demo@townpet.dev";
const DEMO_USER_NICKNAME = "입양데모";

const adoptionPosts = [
  {
    title: "사람을 좋아하는 2살 믹스견 코코",
    content:
      "실내 적응이 빠르고 사람 손길을 잘 따르는 아이입니다. 산책 리드 훈련을 시작했고, 첫 만남에서도 긴장을 크게 하지 않습니다.",
    imageUrl: "/uploads/1771498436056-70bcff26-10c7-409a-b9a0-ba1d18e7b86f.png",
    listing: {
      shelterName: "강동 해피테일 보호소",
      region: "서울 강동구",
      animalType: "강아지",
      breed: "믹스견",
      ageLabel: "2살 추정",
      sex: "FEMALE" as const,
      sizeLabel: "중형",
      status: "OPEN" as const,
      isNeutered: true,
      isVaccinated: true,
    },
  },
  {
    title: "조용한 성격의 3살 치즈 고양이 마루",
    content:
      "낯선 공간에서는 차분하게 지켜보는 편이지만 익숙해지면 손을 먼저 내미는 아이입니다. 1묘 가정에 특히 잘 맞습니다.",
    imageUrl: "/uploads/1771498505175-b5b8aecc-1b8c-401e-baf2-f120ae4d2aba.png",
    listing: {
      shelterName: "마포 냥이쉼터",
      region: "서울 마포구",
      animalType: "고양이",
      breed: "코리안숏헤어",
      ageLabel: "3살 추정",
      sex: "MALE" as const,
      sizeLabel: "소형",
      status: "OPEN" as const,
      isNeutered: true,
      isVaccinated: true,
    },
  },
  {
    title: "산책을 기다리는 1살 진도 믹스 모카",
    content:
      "에너지가 좋고 산책 반응이 매우 뛰어난 아이입니다. 활동량이 있는 보호자와 잘 맞고, 기본 사회화는 무난한 편입니다.",
    imageUrl: "/uploads/1771501467432-a80f9b51-cc43-4d37-a0f9-dc8cf51f99f6.png",
    listing: {
      shelterName: "수영 온기동물보호센터",
      region: "부산 수영구",
      animalType: "강아지",
      breed: "진도 믹스",
      ageLabel: "1살 추정",
      sex: "MALE" as const,
      sizeLabel: "중대형",
      status: "RESERVED" as const,
      isNeutered: false,
      isVaccinated: true,
    },
  },
  {
    title: "사람 곁을 좋아하는 5개월령 아깽이 여름",
    content:
      "활발하지만 공격성은 거의 없고, 장난감 반응이 좋아 집 적응이 빠릅니다. 초보 집사도 돌보기 쉬운 편입니다.",
    imageUrl: "/uploads/1771502481440-aea1f0a2-1d77-45fc-bfe1-a6684a478c56.png",
    listing: {
      shelterName: "연남 포포 보호실",
      region: "서울 마포구",
      animalType: "고양이",
      breed: "코리안숏헤어",
      ageLabel: "5개월 추정",
      sex: "FEMALE" as const,
      sizeLabel: "소형",
      status: "OPEN" as const,
      isNeutered: false,
      isVaccinated: false,
    },
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {
      nickname: DEMO_USER_NICKNAME,
      emailVerified: new Date(),
    },
    create: {
      email: DEMO_USER_EMAIL,
      nickname: DEMO_USER_NICKNAME,
      emailVerified: new Date(),
    },
    select: { id: true },
  });

  let createdCount = 0;

  for (const adoptionPost of adoptionPosts) {
    const existing = await prisma.post.findFirst({
      where: {
        authorId: user.id,
        title: adoptionPost.title,
        type: PostType.ADOPTION_LISTING,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.post.create({
      data: {
        title: adoptionPost.title,
        content: adoptionPost.content,
        type: PostType.ADOPTION_LISTING,
        scope: PostScope.GLOBAL,
        boardScope: "COMMON",
        commonBoardType: CommonBoardType.ADOPTION,
        animalTags: [adoptionPost.listing.animalType],
        authorId: user.id,
        images: {
          create: [
            {
              url: adoptionPost.imageUrl,
              order: 0,
            },
          ],
        },
        adoptionListing: {
          create: adoptionPost.listing,
        },
      },
    });
    createdCount += 1;
  }

  console.log(`adoption demo seed complete: ${createdCount} created`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
