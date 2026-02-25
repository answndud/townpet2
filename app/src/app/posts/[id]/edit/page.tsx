import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostDetailEditForm } from "@/components/posts/post-detail-edit-form";
import { auth } from "@/lib/auth";
import { getPostById } from "@/server/queries/post.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

type PostEditPageProps = {
  params?: Promise<{ id?: string }>;
};

export default async function PostEditPage({ params }: PostEditPageProps) {
  const resolvedParams = (await params) ?? {};
  const session = await auth();
  const userId = session?.user?.id;
  const user = userId ? await getUserWithNeighborhoods(userId) : null;

  const post = await getPostById(resolvedParams.id);

  if (!post) {
    notFound();
  }

  const isGuestEdit = Boolean((post as { guestDisplayName?: string | null }).guestDisplayName) && !user;
  if (!isGuestEdit && !user) {
    redirect("/login");
  }

  if (user && post.authorId !== user.id) {
    notFound();
  }

  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  if (user && !primaryNeighborhood && post.scope !== "GLOBAL") {
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
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <Link
          href={`/posts/${post.id}`}
          className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]"
        >
          게시글로 돌아가기
        </Link>
        <PostDetailEditForm
          postId={post.id}
          title={post.title}
          content={post.content}
          scope={post.scope}
          neighborhoodId={post.neighborhood?.id ?? null}
          imageUrls={post.images.map((image) => image.url)}
          neighborhoods={
            isGuestEdit || !user
              ? []
              : user.neighborhoods.map((item) => ({
                  id: item.neighborhood.id,
                  name: item.neighborhood.name,
                  city: item.neighborhood.city,
                  district: item.neighborhood.district,
                }))
          }
          isAuthenticated={Boolean(user)}
        />
      </main>
    </div>
  );
}
