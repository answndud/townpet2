import { redirect } from "next/navigation";

import { PostDetailClient } from "@/components/posts/post-detail-client";
import { getCurrentUser } from "@/server/auth";

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
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/posts/${postId}/guest`);
  }
  return <PostDetailClient postId={postId} />;
}
