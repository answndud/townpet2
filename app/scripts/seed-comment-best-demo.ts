import "dotenv/config";
import { PostScope, PostStatus, PostType, PrismaClient, UserRole } from "@prisma/client";

import { resolveBoardByPostType } from "../src/lib/community-board";

const prisma = new PrismaClient();

const DEMO_POST_TITLE = "[댓글 데모] 베스트 댓글/원댓글 이동 확인용";
const DEMO_POST_CONTENT = [
  "베스트 댓글 UI 확인용 더미 게시글입니다.",
  "",
  "- 상단에 좋아요 10개 이상 댓글 TOP 4가 보여야 합니다.",
  "- 하단 일반 댓글은 최신순으로 보여야 합니다.",
  "- 베스트 댓글의 `원댓글로 가기`는 페이지가 다르면 해당 페이지를 불러온 뒤 댓글 위치로 이동해야 합니다.",
].join("\n");

const DEMO_CATEGORY = {
  slug: "dogs",
  labelKo: "강아지",
};

const DEMO_COMMUNITY = {
  slug: "dogs",
  labelKo: "강아지",
};

const DEMO_USERS = [
  { email: "comment.demo.author@townpet.dev", nickname: "comment-demo-author" },
  { email: "comment.demo.alpha@townpet.dev", nickname: "comment-demo-alpha" },
  { email: "comment.demo.bravo@townpet.dev", nickname: "comment-demo-bravo" },
  { email: "comment.demo.charlie@townpet.dev", nickname: "comment-demo-charlie" },
  { email: "comment.demo.delta@townpet.dev", nickname: "comment-demo-delta" },
  { email: "comment.demo.echo@townpet.dev", nickname: "comment-demo-echo" },
  { email: "comment.demo.foxtrot@townpet.dev", nickname: "comment-demo-foxtrot" },
  { email: "comment.demo.golf@townpet.dev", nickname: "comment-demo-golf" },
] as const;

function minutesAgo(baseTime: Date, minutes: number) {
  return new Date(baseTime.getTime() - minutes * 60_000);
}

async function ensureCommunityId() {
  let category = await prisma.communityCategory.findUnique({
    where: { slug: DEMO_CATEGORY.slug },
    select: { id: true },
  });

  if (!category) {
    category = await prisma.communityCategory.create({
      data: {
        slug: DEMO_CATEGORY.slug,
        labelKo: DEMO_CATEGORY.labelKo,
        sortOrder: 1,
        isActive: true,
      },
      select: { id: true },
    });
  }

  let community = await prisma.community.findUnique({
    where: { slug: DEMO_COMMUNITY.slug },
    select: { id: true },
  });

  if (!community) {
    community = await prisma.community.create({
      data: {
        categoryId: category.id,
        slug: DEMO_COMMUNITY.slug,
        labelKo: DEMO_COMMUNITY.labelKo,
        sortOrder: 1,
        isActive: true,
        defaultPostTypes: [PostType.FREE_POST, PostType.FREE_BOARD, PostType.QA_QUESTION],
        tags: ["댓글", "베스트", "데모"],
      },
      select: { id: true },
    });
  }

  return community.id;
}

async function ensureDemoUsers() {
  const userIdByEmail = new Map<string, string>();

  for (const demoUser of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        nickname: demoUser.nickname,
        role: UserRole.USER,
        emailVerified: new Date("2026-03-11T09:00:00Z"),
      },
      create: {
        email: demoUser.email,
        nickname: demoUser.nickname,
        role: UserRole.USER,
        emailVerified: new Date("2026-03-11T09:00:00Z"),
      },
      select: { id: true, email: true },
    });

    userIdByEmail.set(user.email, user.id);
  }

  return userIdByEmail;
}

async function ensureDemoPost(authorId: string, communityId: string) {
  const board = resolveBoardByPostType(PostType.FREE_POST);
  const existing = await prisma.post.findFirst({
    where: {
      authorId,
      title: DEMO_POST_TITLE,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.comment.deleteMany({
      where: {
        postId: existing.id,
      },
    });

    return prisma.post.update({
      where: { id: existing.id },
      data: {
        title: DEMO_POST_TITLE,
        content: DEMO_POST_CONTENT,
        type: PostType.FREE_POST,
        scope: PostScope.GLOBAL,
        status: PostStatus.ACTIVE,
        boardScope: board.boardScope,
        commonBoardType: board.commonBoardType,
        petTypeId: communityId,
        likeCount: 0,
        dislikeCount: 0,
        viewCount: 0,
        commentCount: 0,
      },
      select: { id: true },
    });
  }

  return prisma.post.create({
    data: {
      authorId,
      title: DEMO_POST_TITLE,
      content: DEMO_POST_CONTENT,
      type: PostType.FREE_POST,
      scope: PostScope.GLOBAL,
      boardScope: board.boardScope,
      commonBoardType: board.commonBoardType,
      petTypeId: communityId,
      likeCount: 0,
      dislikeCount: 0,
      viewCount: 0,
      commentCount: 0,
    },
    select: { id: true },
  });
}

async function seedDemoComments(postId: string, userIdByEmail: Map<string, string>) {
  const authorIds = DEMO_USERS.map((demoUser) => userIdByEmail.get(demoUser.email)).filter(
    (userId): userId is string => Boolean(userId),
  );
  const baseTime = new Date("2026-03-11T18:00:00Z");
  const rootCommentIds: string[] = [];

  for (let index = 0; index < 36; index += 1) {
    const order = index + 1;
    const authorId = authorIds[(index + 1) % authorIds.length];
    const isOldBestRoot = order === 1;
    const isMidBestRoot = order === 24;
    const isRecentBestRoot = order === 33;
    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId,
        content: isOldBestRoot
          ? "[BEST/PAGE2 ROOT] 오래된 루트 댓글입니다. 상단 베스트 댓글과 페이지 이동 테스트용입니다."
          : isMidBestRoot
            ? "[BEST/PAGE1 ROOT] 현재 페이지 베스트 댓글 예시입니다."
            : isRecentBestRoot
              ? "[BEST/PAGE1 ROOT] 최신 영역에서도 베스트로 올라갈 수 있는 댓글 예시입니다."
              : `최신 댓글 예시 ${String(order).padStart(2, "0")} - 최신순 정렬 확인용 댓글입니다.`,
        likeCount: isOldBestRoot ? 42 : isMidBestRoot ? 28 : isRecentBestRoot ? 12 : order % 5,
        dislikeCount: isOldBestRoot ? 2 : isMidBestRoot ? 1 : isRecentBestRoot ? 0 : order % 2,
        createdAt: minutesAgo(baseTime, 140 - order),
        updatedAt: minutesAgo(baseTime, 140 - order),
      },
      select: { id: true },
    });

    rootCommentIds.push(comment.id);
  }

  const oldestRootId = rootCommentIds[0];
  const recentRootId = rootCommentIds[34];

  const bestReply = await prisma.comment.create({
    data: {
      postId,
      authorId: authorIds[2],
      parentId: oldestRootId,
      content:
        "[BEST/PAGE2 REPLY] 답글이 베스트 댓글로 선정되는 경우 원댓글로 가기 버튼이 page 2로 이동해야 합니다.",
      likeCount: 19,
      dislikeCount: 1,
      createdAt: minutesAgo(baseTime, 138),
      updatedAt: minutesAgo(baseTime, 138),
    },
    select: { id: true },
  });

  await prisma.comment.create({
    data: {
      postId,
      authorId: authorIds[4],
      parentId: recentRootId,
      content: "최신 댓글 아래 일반 답글 예시입니다.",
      likeCount: 3,
      dislikeCount: 0,
      createdAt: minutesAgo(baseTime, 2),
      updatedAt: minutesAgo(baseTime, 2),
    },
  });

  const commentCount = await prisma.comment.count({
    where: { postId },
  });

  await prisma.post.update({
    where: { id: postId },
    data: {
      commentCount,
    },
  });

  return {
    commentCount,
    bestReplyId: bestReply.id,
    oldestRootId,
    recentRootId,
  };
}

async function main() {
  const [communityId, userIdByEmail] = await Promise.all([ensureCommunityId(), ensureDemoUsers()]);
  const authorId = userIdByEmail.get(DEMO_USERS[0].email);

  if (!authorId) {
    throw new Error("demo author not found");
  }

  const post = await ensureDemoPost(authorId, communityId);
  const seeded = await seedDemoComments(post.id, userIdByEmail);

  console.log(
    JSON.stringify(
      {
        postId: post.id,
        title: DEMO_POST_TITLE,
        guestUrl: `http://localhost:3000/posts/${post.id}/guest`,
        authUrl: `http://localhost:3000/posts/${post.id}`,
        commentCount: seeded.commentCount,
        bestReplyId: seeded.bestReplyId,
        oldestRootId: seeded.oldestRootId,
        recentRootId: seeded.recentRootId,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("seed comment best demo failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
