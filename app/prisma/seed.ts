import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const neighborhoods = [
  { name: "서초동", city: "서울", district: "서초구" },
  { name: "연남동", city: "서울", district: "마포구" },
  { name: "수영동", city: "부산", district: "수영구" },
];

async function main() {
  for (const neighborhood of neighborhoods) {
    await prisma.neighborhood.upsert({
      where: {
        name_city_district: {
          name: neighborhood.name,
          city: neighborhood.city,
          district: neighborhood.district,
        },
      },
      update: {},
      create: neighborhood,
    });
  }

  const user = await prisma.user.upsert({
    where: { email: "demo@townpet.dev" },
    update: {},
    create: {
      email: "demo@townpet.dev",
      name: "TownPet Demo",
      nickname: "townpet-demo",
    },
  });

  const primaryNeighborhood = await prisma.neighborhood.findFirst({
    where: { name: "서초동" },
  });

  if (!primaryNeighborhood) {
    return;
  }

  const existingHospital = await prisma.post.findFirst({
    where: { title: "서초동 병원 첫 후기", authorId: user.id },
  });

  if (!existingHospital) {
    await prisma.post.create({
      data: {
        title: "서초동 병원 첫 후기",
        content: "대기 시간은 짧고 설명이 자세했습니다.",
        type: "HOSPITAL_REVIEW",
        scope: "LOCAL",
        authorId: user.id,
        neighborhoodId: primaryNeighborhood.id,
        hospitalReview: {
          create: {
            hospitalName: "서초 24시 동물병원",
            visitDate: new Date(),
            treatmentType: "피부염 상담",
            totalCost: 35000,
            waitTime: 15,
            rating: 5,
          },
        },
      },
    });
  }

  const existingPlace = await prisma.post.findFirst({
    where: { title: "연남동 카페 리뷰", authorId: user.id },
  });

  if (!existingPlace) {
    await prisma.post.create({
      data: {
        title: "연남동 카페 리뷰",
        content: "반려견 동반이 편하고 좌석이 넉넉했습니다.",
        type: "PLACE_REVIEW",
        scope: "LOCAL",
        authorId: user.id,
        neighborhoodId: primaryNeighborhood.id,
        placeReview: {
          create: {
            placeName: "루프탑 펫카페",
            placeType: "카페",
            address: "서울 마포구 연남동",
            isPetAllowed: true,
            rating: 4,
          },
        },
      },
    });
  }

  const existingWalk = await prisma.post.findFirst({
    where: { title: "양재천 산책 루트", authorId: user.id },
  });

  if (!existingWalk) {
    await prisma.post.create({
      data: {
        title: "양재천 산책 루트",
        content: "평일 오전에 한적하고 노면이 평평합니다.",
        type: "WALK_ROUTE",
        scope: "LOCAL",
        authorId: user.id,
        neighborhoodId: primaryNeighborhood.id,
        walkRoute: {
          create: {
            routeName: "양재천 코스",
            distance: 3.2,
            duration: 45,
            difficulty: "EASY",
            coordinates: [],
            hasStreetLights: true,
            hasRestroom: true,
            hasParkingLot: false,
            safetyTags: ["야간조명", "자전거주의"],
          },
        },
      },
    });
  }

  const existingFree = await prisma.post.findFirst({
    where: { title: "동네 자유게시판 첫 글", authorId: user.id },
  });

  if (!existingFree) {
    await prisma.post.create({
      data: {
        title: "동네 자유게시판 첫 글",
        content: "이번 주말 산책 모임 할 분 있나요?",
        type: "FREE_BOARD",
        scope: "LOCAL",
        authorId: user.id,
        neighborhoodId: primaryNeighborhood.id,
      },
    });
  }

  const existingDaily = await prisma.post.findFirst({
    where: { title: "오늘의 일상 공유", authorId: user.id },
  });

  if (!existingDaily) {
    await prisma.post.create({
      data: {
        title: "오늘의 일상 공유",
        content: "비 오는 날이라 실내 카페에서 쉬었어요.",
        type: "DAILY_SHARE",
        scope: "LOCAL",
        authorId: user.id,
        neighborhoodId: primaryNeighborhood.id,
      },
    });
  }

  const existingProduct = await prisma.post.findFirst({
    where: { title: "사료 제품 리뷰", authorId: user.id },
  });

  if (!existingProduct) {
    await prisma.post.create({
      data: {
        title: "사료 제품 리뷰",
        content: "알러지 반응이 없고 기호성이 좋았습니다.",
        type: "PRODUCT_REVIEW",
        scope: "GLOBAL",
        authorId: user.id,
      },
    });
  }

  const existingShowcase = await prisma.post.findFirst({
    where: { title: "우리집 반려견 자랑", authorId: user.id },
  });

  if (!existingShowcase) {
    await prisma.post.create({
      data: {
        title: "우리집 반려견 자랑",
        content: "오늘 산책에서 찍은 사진을 공유합니다.",
        type: "PET_SHOWCASE",
        scope: "GLOBAL",
        authorId: user.id,
      },
    });
  }

  const categoryPosts = [
    {
      title: "자유게시판 테스트",
      content: "동네 질문이나 수다를 자유롭게 나눠요.",
      type: "FREE_BOARD",
      scope: "LOCAL",
    },
    {
      title: "일상 공유 테스트",
      content: "오늘은 비가 와서 실내에서 놀았어요.",
      type: "DAILY_SHARE",
      scope: "LOCAL",
    },
    {
      title: "제품 리뷰 테스트",
      content: "간식 기호성이 좋아서 재구매했어요.",
      type: "PRODUCT_REVIEW",
      scope: "GLOBAL",
    },
    {
      title: "내 반려동물 자랑 테스트",
      content: "산책 중 찍은 사진 공유합니다!",
      type: "PET_SHOWCASE",
      scope: "GLOBAL",
    },
    {
      title: "산책로 테스트",
      content: "야간에도 안전한 코스입니다.",
      type: "WALK_ROUTE",
      scope: "LOCAL",
      walkRoute: {
        create: {
          routeName: "테스트 산책 코스",
          distance: 2.1,
          duration: 30,
          difficulty: "MODERATE",
          coordinates: [],
          hasStreetLights: true,
          hasRestroom: false,
          hasParkingLot: false,
          safetyTags: ["야간조명"],
        },
      },
    },
    {
      title: "병원 리뷰 테스트",
      content: "친절하고 설명이 자세했어요.",
      type: "HOSPITAL_REVIEW",
      scope: "LOCAL",
      hospitalReview: {
        create: {
          hospitalName: "테스트 동물병원",
          visitDate: new Date(),
          treatmentType: "기초 검진",
          totalCost: 25000,
          waitTime: 10,
          rating: 4,
        },
      },
    },
    {
      title: "장소 리뷰 테스트",
      content: "좌석이 넓고 반려견 동반이 편했어요.",
      type: "PLACE_REVIEW",
      scope: "LOCAL",
      placeReview: {
        create: {
          placeName: "테스트 펫카페",
          placeType: "카페",
          address: "서울 마포구",
          isPetAllowed: true,
          rating: 5,
        },
      },
    },
  ];

  for (const post of categoryPosts) {
    const existing = await prisma.post.findFirst({
      where: { title: post.title, authorId: user.id },
    });

    if (!existing) {
      await prisma.post.create({
        data: {
          title: post.title,
          content: post.content,
          type: post.type as never,
          scope: post.scope as never,
          authorId: user.id,
          neighborhoodId: post.scope === "LOCAL" ? primaryNeighborhood.id : null,
          ...(post.walkRoute ? { walkRoute: post.walkRoute } : {}),
          ...(post.hospitalReview ? { hospitalReview: post.hospitalReview } : {}),
          ...(post.placeReview ? { placeReview: post.placeReview } : {}),
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
