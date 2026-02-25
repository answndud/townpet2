import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function tableHasColumn(table: "Post" | "Comment", column: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function countRemainingBackfill(table: "Post" | "Comment") {
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM "${table}"
    WHERE "guestAuthorId" IS NULL
      AND "guestPasswordHash" IS NOT NULL
  `;
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const [hasPostLegacy, hasCommentLegacy, guestAuthors, guestPosts, guestComments] =
    await Promise.all([
      tableHasColumn("Post", "guestPasswordHash"),
      tableHasColumn("Comment", "guestPasswordHash"),
      prisma.guestAuthor.count(),
      prisma.post.count({ where: { guestAuthorId: { not: null } } }),
      prisma.comment.count({ where: { guestAuthorId: { not: null } } }),
    ]);

  const postRemaining = hasPostLegacy ? await countRemainingBackfill("Post") : 0;
  const commentRemaining = hasCommentLegacy ? await countRemainingBackfill("Comment") : 0;

  console.log(
    JSON.stringify({
      postRemaining,
      commentRemaining,
      guestAuthors,
      guestPosts,
      guestComments,
      legacyColumnsPresent: hasPostLegacy || hasCommentLegacy,
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
