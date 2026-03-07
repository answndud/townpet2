import { redirect } from "next/navigation";

import { PostDetailClient } from "@/components/posts/post-detail-client";
import { getCspNonce } from "@/lib/csp-nonce";
import { getCurrentUser } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";

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
  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: user.nickname,
  });
  const cspNonce = await getCspNonce();
  return <PostDetailClient postId={postId} cspNonce={cspNonce} />;
}
