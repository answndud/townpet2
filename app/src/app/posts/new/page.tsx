import Link from "next/link";
import { redirect } from "next/navigation";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostCreateForm } from "@/components/posts/post-create-form";
import { auth } from "@/lib/auth";
import { listNeighborhoods } from "@/server/queries/neighborhood.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export default async function NewPostPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const user = await getUserWithNeighborhoods(userId);
  if (!user) {
    redirect("/login");
  }

  const primaryNeighborhood = user.neighborhoods.find((item) => item.isPrimary);
  if (!primaryNeighborhood) {
    return (
      <NeighborhoodGateNotice
        title="글쓰기를 하려면 동네 설정이 필요합니다."
        description="대표 동네를 선택하면 로컬 정보를 작성할 수 있습니다."
      />
    );
  }

  const neighborhoods = await listNeighborhoods();

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.3em] text-[#9a8462]"
        >
          Back to feed
        </Link>

        <section className="rounded-2xl border border-[#e3d6c4] bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">새 글 작성</h1>
            <p className="text-sm text-[#6f6046]">
              템플릿에 맞춰 작성하면 로컬 정보 품질이 올라갑니다.
            </p>
          </div>
          <PostCreateForm
            neighborhoods={neighborhoods}
            defaultNeighborhoodId={primaryNeighborhood.neighborhood.id}
          />
        </section>
      </main>
    </div>
  );
}
