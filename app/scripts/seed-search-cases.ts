import { PostScope, PostType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEARCH_CASE_AUTHOR = {
  email: "search.case@townpet.dev",
  name: "Alex Kangnam",
  nickname: "강남견주",
};

type SearchSeedPost = {
  title: string;
  content: string;
  type: PostType;
  scope?: PostScope;
};

const SEARCH_SEED_POSTS: SearchSeedPost[] = [
  {
    title: "강남 산책로 추천: 주차 가능한 코스",
    content: "강남에서 주차 가능 산책 코스를 정리했습니다.",
    type: "WALK_ROUTE",
    scope: "GLOBAL",
  },
  {
    title: "동물병원 후기: 강남 24시 메디컬센터",
    content: "동물병원 후기와 진료 경험을 공유합니다.",
    type: "HOSPITAL_REVIEW",
    scope: "GLOBAL",
  },
  {
    title: "예방접종 비용 정리",
    content: "강아지 예방접종 비용과 진료비를 항목별로 기록했습니다.",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "슬개골 관리 경험담",
    content: "슬개골 이슈로 병원 다닌 기록과 재활 팁을 남깁니다.",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "중성화 수술 후기",
    content: "중성화 준비물, 비용, 회복 기간까지 정리합니다.",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "강아지 산책 코스 추천",
    content: "산책코스로 인기 많은 루트를 모았습니다.",
    type: "WALK_ROUTE",
    scope: "GLOBAL",
  },
  {
    title: "Alex가 정리한 동네 병원 리스트",
    content: "작성자 검색 Alex 케이스 검증용 게시글입니다.",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "강남견주 추천 산책 루트",
    content: "작성자 닉네임 정확 매치 케이스를 위한 글입니다.",
    type: "WALK_ROUTE",
    scope: "GLOBAL",
  },
  {
    title: "분실: 서초동 갈색 푸들 제보 부탁",
    content: "분실 신고 글입니다. 목격 정보 부탁드립니다.",
    type: "LOST_FOUND",
    scope: "GLOBAL",
  },
  {
    title: "우리동네 병원 선택 기준",
    content: "지역+병원 복합 키워드 검색 케이스 검증용입니다.",
    type: "HOSPITAL_REVIEW",
    scope: "GLOBAL",
  },
  {
    title: "24시 응급 진료 가능한 병원 목록",
    content: "야간 응급 대응 가능한 병원을 모았습니다.",
    type: "HOSPITAL_REVIEW",
    scope: "GLOBAL",
  },
  {
    title: "기호성 높은 사료 추천",
    content: "강아지 사료 추천 기준과 급여 후기를 남깁니다.",
    type: "PRODUCT_REVIEW",
    scope: "GLOBAL",
  },
  {
    title: "망원동 펫프렌들리 카페 리뷰",
    content: "카페 좌석, 동반 규정, 가격을 정리했습니다.",
    type: "PLACE_REVIEW",
    scope: "GLOBAL",
  },
  {
    title: "서울숲 산책 후기",
    content: "서울숲 동선과 반려동물 편의시설을 공유합니다.",
    type: "WALK_ROUTE",
    scope: "GLOBAL",
  },
  {
    title: "관절 영양제 급여 후기",
    content: "관절 영양제 성분과 복용 반응을 기록했습니다.",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "주말 번개 산책 모임 모집",
    content: "주말 번개 참여하실 분 모집합니다.",
    type: "MEETUP",
    scope: "GLOBAL",
  },
  {
    title: "동물 메디컬센터 진료 후기",
    content: "메디컬센터 진료 프로세스와 대기시간 후기입니다.",
    type: "HOSPITAL_REVIEW",
    scope: "GLOBAL",
  },
  {
    title: "주차 가능 산책 루트 모음",
    content: "주차 가능 산책 장소를 구 단위로 정리했습니다.",
    type: "WALK_ROUTE",
    scope: "GLOBAL",
  },
  {
    title: "강남 병원 후기 모음",
    content: "후기 키워드 검색 밸런스 확인용 글입니다.",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "키보드 자모 입력 테스트",
    content: "ㅅㅏㄴㅊㅐㄱ 같은 비정상 질의 처리 확인용 글",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "고양이 건강검진 후기",
    content: "고양이 예방의학 검진 루틴을 공유합니다.",
    type: "FREE_POST",
    scope: "GLOBAL",
  },
  {
    title: "Pet-friendly 펫프렌들리 식당 추천",
    content: "영문+한글 혼합 키워드 검색 검증용입니다.",
    type: "PLACE_REVIEW",
    scope: "GLOBAL",
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: SEARCH_CASE_AUTHOR.email },
    update: {
      name: SEARCH_CASE_AUTHOR.name,
      nickname: SEARCH_CASE_AUTHOR.nickname,
      emailVerified: new Date(),
    },
    create: {
      email: SEARCH_CASE_AUTHOR.email,
      name: SEARCH_CASE_AUTHOR.name,
      nickname: SEARCH_CASE_AUTHOR.nickname,
      emailVerified: new Date(),
    },
  });

  let created = 0;
  let updated = 0;

  for (const post of SEARCH_SEED_POSTS) {
    const existing = await prisma.post.findFirst({
      where: {
        authorId: user.id,
        title: post.title,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.post.update({
        where: { id: existing.id },
        data: {
          content: post.content,
          type: post.type,
          scope: post.scope ?? "GLOBAL",
          status: "ACTIVE",
        },
      });
      updated += 1;
      continue;
    }

    await prisma.post.create({
      data: {
        authorId: user.id,
        title: post.title,
        content: post.content,
        type: post.type,
        scope: post.scope ?? "GLOBAL",
        status: "ACTIVE",
      },
    });
    created += 1;
  }

  console.log(
    `Search case posts ready. author=${user.email}, created=${created}, updated=${updated}, total=${SEARCH_SEED_POSTS.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
