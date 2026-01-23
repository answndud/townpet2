import Link from "next/link";
import { notFound } from "next/navigation";

import { PostDetailEditForm } from "@/components/posts/post-detail-edit-form";
import { listNeighborhoods } from "@/server/queries/neighborhood.queries";
import { getPostById } from "@/server/queries/post.queries";
import { getUserByEmail } from "@/server/queries/user.queries";

type PostEditPageProps = {
  params?: Promise<{ id?: string }>;
};

export default async function PostEditPage({ params }: PostEditPageProps) {
  const resolvedParams = (await params) ?? {};
  const email = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
  const [post, neighborhoods, user] = await Promise.all([
    getPostById(resolvedParams.id),
    listNeighborhoods(),
    getUserByEmail(email),
  ]);

  if (!post || !user || post.authorId !== user.id) {
    notFound();
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
