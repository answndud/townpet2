import { PostDetailClient } from "@/components/posts/post-detail-client";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params?: Promise<{ id?: string }>;
};

export async function generateMetadata() {
  return { title: "게시글" };
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = (await params) ?? {};
  const postId = resolvedParams.id ?? "";
  return <PostDetailClient postId={postId} />;
}
