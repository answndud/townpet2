import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostDetailEditForm } from "@/components/posts/post-detail-edit-form";
import { auth } from "@/lib/auth";
import { listNeighborhoods } from "@/server/queries/neighborhood.queries";
import { getPostById } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

type PostEditPageProps = {
  params?: Promise<{ id?: string }>;
};

export default async function PostEditPage({ params }: PostEditPageProps) {
  const resolvedParams = (await params) ?? {};
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const user = await getUserWithNeighborhoods(userId);
  if (!user) {
    redirect("/login");
  }

  const [post, neighborhoods] = await Promise.all([
    getPostById(resolvedParams.id),
    listNeighborhoods(),
  ]);

  if (!post || post.authorId !== user.id) {
    notFound();
  }

  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);
  if (!primaryNeighborhood && post.scope !== "GLOBAL") {
    return (
      <NeighborhoodGateNotice
        title="수정하려면 동네 설정이 필요합니다."
        description="대표 동네를 설정하면 로컬 게시물을 수정할 수 있습니다."
        secondaryLink="/onboarding"
        secondaryLabel="동네 설정하기"
      />
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-14">
        <Link
          href={`/posts/${post.id}`}
          className="text-xs uppercase tracking-[0.3em] text-[#9a8462]"
        >
          Back to post
        </Link>
        <PostDetailEditForm
          postId={post.id}
          title={post.title}
          content={post.content}
          scope={post.scope}
          neighborhoodId={post.neighborhood?.id ?? null}
          neighborhoods={neighborhoods}
        />
      </main>
    </div>
  );
}
