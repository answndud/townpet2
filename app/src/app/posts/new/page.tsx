import Link from "next/link";

import { PostCreateForm } from "@/components/posts/post-create-form";
import { auth } from "@/lib/auth";
import { listCommunities } from "@/server/queries/community.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

export default async function NewPostPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const user = userId ? await getUserWithNeighborhoods(userId) : null;
  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);

  const neighborhoods = user
    ? user.neighborhoods.map((item) => ({
        id: item.neighborhood.id,
        name: item.neighborhood.name,
        city: item.neighborhood.city,
        district: item.neighborhood.district,
      }))
    : [];
  const communities = await listCommunities({ limit: 50 });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f7ff_0%,#eef4ff_100%)]">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-10">
        <Link
          href="/feed"
          className="inline-flex w-fit items-center rounded-sm border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] transition hover:bg-[#f3f7ff]"
        >
          목록으로
        </Link>

        <section className="rounded-md border border-[#c8d7ef] bg-white p-4 shadow-[0_10px_24px_rgba(16,40,74,0.06)] sm:p-6">
          <div className="mb-4 flex flex-col gap-1.5 border-b border-[#dde7f5] pb-3 sm:mb-5 sm:gap-2 sm:pb-4">
            <h1 className="text-[26px] font-semibold text-[#10284a] sm:text-2xl">새 글 작성</h1>
            <p className="text-xs text-[#4f678d] sm:text-sm">
              {userId
                ? "핵심 정보 위주로 작성해 커뮤니티 피드 품질을 높여 주세요."
                : "비회원 글은 즉시 공개되며, 외부 링크/연락처/고위험 카테고리는 제한됩니다."}
            </p>
          </div>
          <PostCreateForm
            neighborhoods={neighborhoods}
            communities={communities.items}
            defaultNeighborhoodId={primaryNeighborhood?.neighborhood.id}
            isAuthenticated={Boolean(userId)}
          />
        </section>
      </main>
    </div>
  );
}
