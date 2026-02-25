import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { UserRelationControls } from "@/components/user/user-relation-controls";
import { auth } from "@/lib/auth";
import { formatRelativeDate } from "@/lib/post-presenter";
import { toAbsoluteUrl } from "@/lib/site-url";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import {
  getPublicUserProfileById,
  listPetsByUserId,
  listPublicUserComments,
  listPublicUserPosts,
  listPublicUserReactions,
} from "@/server/queries/user.queries";

type UserProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string; cursor?: string }>;
};

type ActivityTab = "posts" | "comments" | "reactions";

function speciesLabel(species: string) {
  if (species === "CAT") return "고양이";
  if (species === "BIRD") return "조류";
  if (species === "REPTILE") return "파충류";
  if (species === "SMALL_PET") return "소동물";
  if (species === "AQUATIC") return "어류/수조";
  if (species === "AMPHIBIAN") return "양서류";
  if (species === "ARTHROPOD") return "절지류/곤충";
  if (species === "SPECIAL_OTHER") return "특수동물/기타";
  return "강아지";
}

function toTab(value?: string): ActivityTab {
  if (value === "comments" || value === "reactions") {
    return value;
  }
  return "posts";
}

function buildBioExcerpt(text: string, maxLength = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

function buildTabHref(userId: string, tab: ActivityTab, cursor?: string | null) {
  const query = new URLSearchParams();
  query.set("tab", tab);
  if (cursor) {
    query.set("cursor", cursor);
  }

  return `/users/${userId}?${query.toString()}`;
}

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const profile = await getPublicUserProfileById(resolvedParams.id);

  if (!profile) {
    return {
      title: "사용자를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const displayName = profile.nickname ?? profile.name ?? "익명 사용자";
  const description = profile.bio?.trim()
    ? buildBioExcerpt(profile.bio)
    : `${displayName}님의 TownPet 활동 프로필`;
  const url = toAbsoluteUrl(`/users/${profile.id}`);

  return {
    title: `${displayName} 프로필`,
    description,
    alternates: {
      canonical: `/users/${profile.id}`,
    },
    openGraph: {
      type: "profile",
      title: `${displayName} 프로필`,
      description,
      url,
      images: profile.image ? [{ url: toAbsoluteUrl(profile.image) }] : undefined,
    },
    twitter: {
      card: profile.image ? "summary_large_image" : "summary",
      title: `${displayName} 프로필`,
      description,
      images: profile.image ? [toAbsoluteUrl(profile.image)] : undefined,
    },
  };
}

export default async function PublicUserProfilePage({
  params,
  searchParams,
}: UserProfilePageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
  ]);
  const tab = toTab((resolvedSearchParams as { tab?: string } | undefined)?.tab);
  const cursorValue = (resolvedSearchParams as { cursor?: string } | undefined)?.cursor;
  const cursor = cursorValue && cursorValue.length > 0 ? cursorValue : undefined;

  const session = await auth();
  const viewerId = session?.user?.id;

  if (viewerId && viewerId === id) {
    redirect("/profile");
  }

  const profile = await getPublicUserProfileById(id);
  if (!profile) {
    notFound();
  }

  const relationState = viewerId
    ? await getUserRelationState(viewerId, profile.id)
    : {
        isBlockedByMe: false,
        hasBlockedMe: false,
        isMutedByMe: false,
      };

  const [postsPage, commentsPage, reactionsPage, pets] = await Promise.all([
    tab === "posts"
      ? listPublicUserPosts({ userId: profile.id, limit: 20, cursor })
      : Promise.resolve({ items: [], nextCursor: null }),
    tab === "comments"
      ? listPublicUserComments({ userId: profile.id, limit: 20, cursor })
      : Promise.resolve({ items: [], nextCursor: null }),
    tab === "reactions"
      ? listPublicUserReactions({ userId: profile.id, limit: 20, cursor })
      : Promise.resolve({ items: [], nextCursor: null }),
    listPetsByUserId(profile.id),
  ]);
  const posts = postsPage.items;
  const comments = commentsPage.items;
  const reactions = reactionsPage.items;
  const nextCursor =
    tab === "posts"
      ? postsPage.nextCursor
      : tab === "comments"
        ? commentsPage.nextCursor
        : reactionsPage.nextCursor;

  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.nickname ?? profile.name ?? "익명 사용자",
    description: profile.bio ?? undefined,
    image: profile.image ? toAbsoluteUrl(profile.image) : undefined,
    url: toAbsoluteUrl(`/users/${profile.id}`),
  };

  return (
    <div className="min-h-screen pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_100%)] p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">공개 프로필</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-3xl">
            {profile.nickname ?? profile.name ?? "익명 사용자"}
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            가입일 {profile.createdAt.toLocaleDateString("ko-KR")}
          </p>
          <p className="mt-3 text-sm text-[#355988]">
            {profile.bio?.trim() ? profile.bio : "등록된 소개가 없습니다."}
          </p>
          {viewerId ? (
            <div className="mt-4">
              <UserRelationControls targetUserId={profile.id} initialState={relationState} />
            </div>
          ) : null}
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="border border-[#c8d7ef] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">게시글</p>
            <p className="mt-2 text-3xl font-bold text-[#10284a]">{profile.postCount}</p>
          </div>
          <div className="border border-[#c8d7ef] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">댓글</p>
            <p className="mt-2 text-3xl font-bold text-[#10284a]">{profile.commentCount}</p>
          </div>
          <div className="border border-[#c8d7ef] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#5b78a1]">반응</p>
            <p className="mt-2 text-3xl font-bold text-[#10284a]">{profile.reactionCount}</p>
          </div>
        </section>

        <section className="border border-[#c8d7ef] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#153a6a]">반려동물 프로필</h2>
          {pets.length === 0 ? (
            <p className="mt-3 text-sm text-[#5a7398]">등록된 반려동물 프로필이 없습니다.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {pets.map((pet) => (
                <article key={pet.id} className="border border-[#dbe5f3] bg-[#f8fbff] p-3">
                  <div className="flex items-start gap-3">
                    {pet.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pet.imageUrl}
                        alt={`${pet.name} 프로필 이미지`}
                        loading="lazy"
                        className="h-12 w-12 border border-[#bfd0ec] object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center border border-[#bfd0ec] bg-white text-[10px] font-semibold text-[#5b78a1]">
                        PET
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1f3f71]">{pet.name}</p>
                        <p className="text-xs text-[#4f678d]">
                          {speciesLabel(pet.species)}
                          {pet.breedLabel?.trim() ? ` · ${pet.breedLabel}` : ""}
                          {pet.weightKg !== null ? ` · ${pet.weightKg}kg` : ""}
                          {pet.birthYear !== null ? ` · ${pet.birthYear}년생` : ""}
                        </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[#5a7398]">
                    {pet.bio?.trim() ? pet.bio : "소개가 없습니다."}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border border-[#c8d7ef] bg-white p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={buildTabHref(profile.id, "posts")}
              className={`border px-3 py-1.5 ${
                tab === "posts"
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#bfd0ec] bg-white text-[#315484]"
              }`}
            >
              게시글 활동
            </Link>
            <Link
              href={buildTabHref(profile.id, "comments")}
              className={`border px-3 py-1.5 ${
                tab === "comments"
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#bfd0ec] bg-white text-[#315484]"
              }`}
            >
              댓글 활동
            </Link>
            <Link
              href={buildTabHref(profile.id, "reactions")}
              className={`border px-3 py-1.5 ${
                tab === "reactions"
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#bfd0ec] bg-white text-[#315484]"
              }`}
            >
              반응 활동
            </Link>
          </div>

          {tab === "posts" ? (
            <div className="mt-4 divide-y divide-[#e1e9f5]">
              {posts.length === 0 ? (
                <p className="py-6 text-sm text-[#5a7398]">게시글 활동이 없습니다.</p>
              ) : (
                posts.map((post) => (
                  <article key={post.id} className="py-3">
                    <Link href={`/posts/${post.id}`} className="font-semibold text-[#163462] hover:text-[#2f5da4]">
                      {post.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#5a7398]">
                      {formatRelativeDate(post.createdAt)} · 좋아요 {post.likeCount} · 댓글{" "}
                      {post.commentCount}
                    </p>
                  </article>
                ))
              )}
              {nextCursor ? (
                <div className="pt-3">
                  <Link
                    href={buildTabHref(profile.id, "posts", nextCursor)}
                    className="inline-flex border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] hover:bg-[#f3f7ff]"
                  >
                    게시글 활동 더 보기
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "comments" ? (
            <div className="mt-4 divide-y divide-[#e1e9f5]">
              {comments.length === 0 ? (
                <p className="py-6 text-sm text-[#5a7398]">댓글 활동이 없습니다.</p>
              ) : (
                comments.map((comment) => (
                  <article key={comment.id} className="py-3">
                    <Link
                      href={`/posts/${comment.post.id}#comment-${comment.id}`}
                      className="font-semibold text-[#163462] hover:text-[#2f5da4]"
                    >
                      {comment.post.title}
                    </Link>
                    <p className="mt-1 text-sm text-[#355988]">
                      {comment.content.length > 100
                        ? `${comment.content.slice(0, 100)}...`
                        : comment.content}
                    </p>
                    <p className="mt-1 text-xs text-[#5a7398]">{formatRelativeDate(comment.createdAt)}</p>
                  </article>
                ))
              )}
              {nextCursor ? (
                <div className="pt-3">
                  <Link
                    href={buildTabHref(profile.id, "comments", nextCursor)}
                    className="inline-flex border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] hover:bg-[#f3f7ff]"
                  >
                    댓글 활동 더 보기
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "reactions" ? (
            <div className="mt-4 divide-y divide-[#e1e9f5]">
              {reactions.length === 0 ? (
                <p className="py-6 text-sm text-[#5a7398]">반응 활동이 없습니다.</p>
              ) : (
                reactions.map((reaction) => (
                  <article key={reaction.id} className="py-3">
                    <Link href={`/posts/${reaction.post.id}`} className="font-semibold text-[#163462] hover:text-[#2f5da4]">
                      {reaction.post.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#5a7398]">
                      {reaction.type === "LIKE" ? "좋아요" : "싫어요"} ·{" "}
                      {formatRelativeDate(reaction.createdAt)} · 작성자{" "}
                      {reaction.post.author.nickname ?? reaction.post.author.name ?? "익명"}
                    </p>
                  </article>
                ))
              )}
              {nextCursor ? (
                <div className="pt-3">
                  <Link
                    href={buildTabHref(profile.id, "reactions", nextCursor)}
                    className="inline-flex border border-[#bfd0ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#315484] hover:bg-[#f3f7ff]"
                  >
                    반응 활동 더 보기
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
