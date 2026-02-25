import "dotenv/config";
import {
  CommonBoardType,
  PostType,
  Prisma,
  PrismaClient,
  PostReactionType,
} from "@prisma/client";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

const neighborhoods = [
  { name: "서초동", city: "서울", district: "서초구" },
  { name: "연남동", city: "서울", district: "마포구" },
  { name: "수영동", city: "부산", district: "수영구" },
];

const communityCategories = [
  { slug: "dogs", labelKo: "강아지", sortOrder: 1 },
  { slug: "cats", labelKo: "고양이", sortOrder: 2 },
  { slug: "birds", labelKo: "조류", sortOrder: 3 },
  { slug: "reptiles", labelKo: "파충류", sortOrder: 4 },
  { slug: "small-pets", labelKo: "소동물", sortOrder: 5 },
  { slug: "aquatics", labelKo: "어류/수조", sortOrder: 6 },
  { slug: "amphibians", labelKo: "양서류", sortOrder: 7 },
  { slug: "arthropods", labelKo: "절지류/곤충", sortOrder: 8 },
  { slug: "special-others", labelKo: "특수동물/기타", sortOrder: 9 },
] as const;

const communitiesToSeed: Array<{
  slug: string;
  labelKo: string;
  categorySlug: (typeof communityCategories)[number]["slug"];
  sortOrder: number;
  tags: string[];
  defaultPostTypes: PostType[];
}> = [
  {
    slug: "dogs",
    labelKo: "강아지",
    categorySlug: "dogs",
    sortOrder: 1,
    tags: ["훈련", "산책", "사료", "건강", "행동"],
    defaultPostTypes: [PostType.FREE_BOARD, PostType.QA_QUESTION, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "cats",
    labelKo: "고양이",
    categorySlug: "cats",
    sortOrder: 2,
    tags: ["화장실", "사료", "스크래처", "건강", "행동"],
    defaultPostTypes: [PostType.FREE_BOARD, PostType.QA_QUESTION, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "birds",
    labelKo: "조류",
    categorySlug: "birds",
    sortOrder: 3,
    tags: ["케이지", "먹이", "소음", "건강", "핸들링"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "parrots",
    labelKo: "앵무새",
    categorySlug: "birds",
    sortOrder: 4,
    tags: ["훈련", "발성", "장난감", "케이지", "영양"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "reptiles",
    labelKo: "파충류",
    categorySlug: "reptiles",
    sortOrder: 5,
    tags: ["온습도", "UVB", "사육장", "먹이", "탈피"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "lizards",
    labelKo: "도마뱀",
    categorySlug: "reptiles",
    sortOrder: 6,
    tags: ["온습도", "급이", "바닥재", "탈피", "행동"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "snakes",
    labelKo: "뱀",
    categorySlug: "reptiles",
    sortOrder: 7,
    tags: ["급이", "은신처", "탈피", "핸들링", "온도"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "turtles",
    labelKo: "거북",
    categorySlug: "reptiles",
    sortOrder: 8,
    tags: ["여과", "수질", "일광욕", "먹이", "성장"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "small-pets",
    labelKo: "소동물",
    categorySlug: "small-pets",
    sortOrder: 9,
    tags: ["케이지", "깔짚", "먹이", "건강", "합사"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "aquatics",
    labelKo: "어류·수조",
    categorySlug: "aquatics",
    sortOrder: 10,
    tags: ["수질", "여과기", "수초", "합사", "질병"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.PRODUCT_REVIEW, PostType.FREE_BOARD, PostType.PET_SHOWCASE],
  },
  {
    slug: "amphibians",
    labelKo: "양서류",
    categorySlug: "amphibians",
    sortOrder: 11,
    tags: ["습도", "은신처", "급이", "수질", "환경세팅"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
  {
    slug: "arthropods",
    labelKo: "절지류·곤충",
    categorySlug: "arthropods",
    sortOrder: 12,
    tags: ["탈피", "은신처", "먹이", "습도", "번식"],
    defaultPostTypes: [PostType.QA_QUESTION, PostType.FREE_BOARD, PostType.PET_SHOWCASE, PostType.PRODUCT_REVIEW],
  },
];

function resolveCommonBoardTypeByPostType(type: PostType): CommonBoardType | null {
  if (type === PostType.HOSPITAL_REVIEW) {
    return CommonBoardType.HOSPITAL;
  }
  if (type === PostType.LOST_FOUND) {
    return CommonBoardType.LOST_FOUND;
  }
  if (type === PostType.MARKET_LISTING) {
    return CommonBoardType.MARKET;
  }
  return null;
}

async function main() {
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("SEED_DEFAULT_PASSWORD is required.");
  }
  const passwordHash = await hashPassword(seedPassword);

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

  const categoryIdBySlug = new Map<string, string>();
  for (const category of communityCategories) {
    const seeded = await prisma.communityCategory.upsert({
      where: { slug: category.slug },
      update: {
        labelKo: category.labelKo,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        slug: category.slug,
        labelKo: category.labelKo,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      select: { id: true, slug: true },
    });
    categoryIdBySlug.set(seeded.slug, seeded.id);
  }

  const communityIdBySlug = new Map<string, string>();
  for (const community of communitiesToSeed) {
    const categoryId = categoryIdBySlug.get(community.categorySlug);
    if (!categoryId) {
      continue;
    }

    const seeded = await prisma.community.upsert({
      where: { slug: community.slug },
      update: {
        categoryId,
        labelKo: community.labelKo,
        sortOrder: community.sortOrder,
        isActive: true,
        tags: community.tags,
        defaultPostTypes: community.defaultPostTypes,
      },
      create: {
        slug: community.slug,
        categoryId,
        labelKo: community.labelKo,
        sortOrder: community.sortOrder,
        isActive: true,
        tags: community.tags,
        defaultPostTypes: community.defaultPostTypes,
      },
      select: { id: true, slug: true },
    });
    communityIdBySlug.set(seeded.slug, seeded.id);
  }

  const defaultCommunityId = communityIdBySlug.get("dogs");
  if (!defaultCommunityId) {
    throw new Error("Seed community data is not ready.");
  }

  const user = await prisma.user.upsert({
    where: { email: "demo@townpet.dev" },
    update: {
      name: "TownPet Demo",
      nickname: "townpet-demo",
      passwordHash,
      emailVerified: new Date(),
    },
    create: {
      email: "demo@townpet.dev",
      name: "TownPet Demo",
      nickname: "townpet-demo",
      passwordHash,
      emailVerified: new Date(),
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
        boardScope: "COMMON",
        commonBoardType: "HOSPITAL",
        animalTags: ["강아지"],
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
        boardScope: "COMMUNITY",
        communityId: defaultCommunityId,
        animalTags: [],
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
        boardScope: "COMMUNITY",
        communityId: defaultCommunityId,
        animalTags: [],
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
        boardScope: "COMMUNITY",
        communityId: defaultCommunityId,
        animalTags: [],
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
        boardScope: "COMMUNITY",
        communityId: defaultCommunityId,
        animalTags: [],
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
        boardScope: "COMMUNITY",
        communityId: defaultCommunityId,
        animalTags: [],
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
        boardScope: "COMMUNITY",
        communityId: defaultCommunityId,
        animalTags: [],
        scope: "GLOBAL",
        authorId: user.id,
      },
    });
  }

  type SeedCategoryPost = {
    title: string;
    content: string;
    type: Prisma.PostCreateInput["type"];
    scope: Prisma.PostCreateInput["scope"];
    walkRoute?: Prisma.WalkRouteCreateNestedOneWithoutPostInput;
    hospitalReview?: Prisma.HospitalReviewCreateNestedOneWithoutPostInput;
    placeReview?: Prisma.PlaceReviewCreateNestedOneWithoutPostInput;
  };

  const categoryPosts: SeedCategoryPost[] = [
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
      const commonBoardType = resolveCommonBoardTypeByPostType(post.type as PostType);
      await prisma.post.create({
        data: {
          title: post.title,
          content: post.content,
          type: post.type as never,
          boardScope: commonBoardType ? "COMMON" : "COMMUNITY",
          communityId: commonBoardType ? null : defaultCommunityId,
          commonBoardType: commonBoardType ?? undefined,
          animalTags: commonBoardType ? ["강아지"] : [],
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

  const reactionUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "demo@townpet.dev",
          "power.reviewer@townpet.dev",
          "hospital.geek@townpet.dev",
          "place.hunter@townpet.dev",
          "route.runner@townpet.dev",
        ],
      },
    },
    select: { id: true, email: true },
  });

  const reactionUserByEmail = new Map(
    reactionUsers.map((reactionUser) => [reactionUser.email, reactionUser.id]),
  );

  const reactionPlan: Array<{
    title: string;
    likes: string[];
    dislikes: string[];
  }> = [
    {
      title: "서초동 병원 첫 후기",
      likes: ["demo@townpet.dev", "power.reviewer@townpet.dev", "hospital.geek@townpet.dev"],
      dislikes: [],
    },
    {
      title: "연남동 카페 리뷰",
      likes: ["demo@townpet.dev", "place.hunter@townpet.dev"],
      dislikes: [],
    },
    {
      title: "양재천 산책 루트",
      likes: ["demo@townpet.dev", "route.runner@townpet.dev"],
      dislikes: [],
    },
    {
      title: "동네 자유게시판 첫 글",
      likes: ["demo@townpet.dev"],
      dislikes: ["route.runner@townpet.dev"],
    },
  ];

  for (const reactionTarget of reactionPlan) {
    const targetPost = await prisma.post.findFirst({
      where: { title: reactionTarget.title, authorId: user.id },
      select: { id: true },
    });

    if (!targetPost) {
      continue;
    }

    for (const email of reactionTarget.likes) {
      const reactionUserId = reactionUserByEmail.get(email);
      if (!reactionUserId) {
        continue;
      }

      await prisma.postReaction.upsert({
        where: {
          postId_userId: {
            postId: targetPost.id,
            userId: reactionUserId,
          },
        },
        update: { type: PostReactionType.LIKE },
        create: {
          postId: targetPost.id,
          userId: reactionUserId,
          type: PostReactionType.LIKE,
        },
      });
    }

    for (const email of reactionTarget.dislikes) {
      const reactionUserId = reactionUserByEmail.get(email);
      if (!reactionUserId) {
        continue;
      }

      await prisma.postReaction.upsert({
        where: {
          postId_userId: {
            postId: targetPost.id,
            userId: reactionUserId,
          },
        },
        update: { type: PostReactionType.DISLIKE },
        create: {
          postId: targetPost.id,
          userId: reactionUserId,
          type: PostReactionType.DISLIKE,
        },
      });
    }

    const groupedReactions = await prisma.postReaction.groupBy({
      by: ["type"],
      where: { postId: targetPost.id },
      _count: { _all: true },
    });

    const likeCount =
      groupedReactions.find((group) => group.type === PostReactionType.LIKE)?._count
        ._all ?? 0;
    const dislikeCount =
      groupedReactions.find((group) => group.type === PostReactionType.DISLIKE)?._count
        ._all ?? 0;

    await prisma.post.update({
      where: { id: targetPost.id },
      data: {
        likeCount,
        dislikeCount,
      },
    });
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
