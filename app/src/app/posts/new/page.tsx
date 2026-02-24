import Link from "next/link";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { PostCreateForm } from "@/components/posts/post-create-form";
import { auth } from "@/lib/auth";
import { listNeighborhoods } from "@/server/queries/neighborhood.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export default async function NewPostPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const user = userId ? await getUserWithNeighborhoods(userId) : null;
  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  if (userId && user && !primaryNeighborhood) {
    return (
      <NeighborhoodGateNotice
        title="글쓰기를 하려면 동네 설정이 필요합니다."
        description="대표 동네를 선택하면 로컬 정보를 작성할 수 있습니다."
      />
    );
  }

  const neighborhoods = userId ? await listNeighborhoods() : [];

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <Link
          href="/feed"
          className="text-xs uppercase tracking-[0.24em] text-[#4e6f9f]"
        >
          목록으로
        </Link>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 border-b border-[#dde7f5] pb-4">
            <h1 className="text-2xl font-semibold text-[#10284a]">새 글 작성</h1>
            <p className="text-sm text-[#4f678d]">
              {userId
                ? "핵심 정보 위주로 작성해 커뮤니티 피드 품질을 높여 주세요."
                : "비회원 글은 즉시 공개되며, 외부 링크/연락처/고위험 카테고리는 제한됩니다."}
            </p>
          </div>
          <PostCreateForm
            neighborhoods={neighborhoods}
            defaultNeighborhoodId={primaryNeighborhood?.neighborhood.id}
            isAuthenticated={Boolean(userId)}
          />
        </section>
      </main>
    </div>
  );
}
