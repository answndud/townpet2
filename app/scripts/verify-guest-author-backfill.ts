import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [postRemaining, commentRemaining, guestAuthors, guestPosts, guestComments] =
    await Promise.all([
      prisma.post.count({
        where: {
          guestPasswordHash: { not: null },
          guestAuthorId: null,
        },
      }),
      prisma.comment.count({
        where: {
          guestPasswordHash: { not: null },
          guestAuthorId: null,
        },
      }),
      prisma.guestAuthor.count(),
      prisma.post.count({ where: { guestAuthorId: { not: null } } }),
      prisma.comment.count({ where: { guestAuthorId: { not: null } } }),
    ]);

  console.log(
    JSON.stringify({
      postRemaining,
      commentRemaining,
      guestAuthors,
      guestPosts,
      guestComments,
      complete: postRemaining === 0 && commentRemaining === 0,
    }),
  );
}

main()
  .catch((error) => {
    console.error("Guest author verification failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
