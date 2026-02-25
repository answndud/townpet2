import Link from "next/link";
import { PostScope, PostType } from "@prisma/client";

import {
  FeedInfiniteList,
  type FeedPostItem,
} from "@/components/posts/feed-infinite-list";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { FEED_PAGE_SIZE } from "@/lib/feed";
import { postTypeMeta } from "@/lib/post-presenter";
import {
  breedCodeParamSchema,
  breedLoungePostListSchema,
} from "@/lib/validations/lounge";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listPosts } from "@/server/queries/post.queries";

type BreedLoungePageProps = {
  params: Promise<{ breedCode?: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const LOUNGE_TYPES: ReadonlyArray<PostType> = [
  PostType.QA_QUESTION,
  PostType.HOSPITAL_REVIEW,
  PostType.PLACE_REVIEW,
  PostType.WALK_ROUTE,
  PostType.MARKET_LISTING,
  PostType.PRODUCT_REVIEW,
  PostType.PET_SHOWCASE,
  PostType.FREE_BOARD,
];

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

function toHref(params: {
  breedCode: string;
  q?: string;
  sort?: "LATEST" | "LIKE" | "COMMENT";
  days?: 3 | 7 | 30;
  type?: PostType;
}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.sort && params.sort !== "LATEST") {
    search.set("sort", params.sort);
  }
  if (params.days) {
    search.set("period", String(params.days));
  }
  if (params.type) {
    search.set("type", params.type);
  }
  const serialized = search.toString();
  return serialized
    ? `/lounges/breeds/${params.breedCode}?${serialized}`
    : `/lounges/breeds/${params.breedCode}`;
}

export default async function BreedLoungePage({ params, searchParams }: BreedLoungePageProps) {
  const resolvedParams = await params;
  const parsedBreedCode = breedCodeParamSchema.safeParse(resolvedParams.breedCode);
  if (!parsedBreedCode.success) {
    return (
      <EmptyState
        title="유효하지 않은 품종 코드"
        description="품종 코드를 다시 확인해 주세요."
        actionHref="/feed"
        actionLabel="피드로 이동"
      />
    );
  }

  const breedCode = parsedBreedCode.data;
  const rawSearchParams = (await searchParams) ?? {};
  const parsedQuery = breedLoungePostListSchema.safeParse({
    q: readSearchParam(rawSearchParams, "q"),
    sort: readSearchParam(rawSearchParams, "sort"),
    days: readSearchParam(rawSearchParams, "period") ?? readSearchParam(rawSearchParams, "days"),
    type: readSearchParam(rawSearchParams, "type"),
    searchIn: readSearchParam(rawSearchParams, "searchIn"),
    personalized: readSearchParam(rawSearchParams, "personalized"),
  });

  const query = parsedQuery.success ? parsedQuery.data : {};
  const session = await auth();
  const viewerId = session?.user?.id;
  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();

  const data = await listPosts({
    limit: FEED_PAGE_SIZE,
    scope: PostScope.GLOBAL,
    q: query.q,
    sort: query.sort,
    searchIn: query.searchIn,
    days: query.days,
    type: query.type,
    excludeTypes: viewerId ? undefined : loginRequiredTypes,
    viewerId: viewerId ?? undefined,
    personalized: Boolean(viewerId) && query.personalized,
    authorBreedCode: breedCode,
  });

  const initialItems: FeedPostItem[] = data.items.map((post) => ({
    id: post.id,
    type: post.type,
    scope: post.scope,
    status: post.status,
    title: post.title,
    content: post.content,
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    dislikeCount: post.dislikeCount,
    viewCount: post.viewCount,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      name: post.author.name,
      nickname: post.author.nickname,
      image: post.author.image,
    },
    guestDisplayName:
      (post as { guestDisplayName?: string | null }).guestDisplayName ??
      (post as { guestAuthor?: { displayName?: string | null } | null }).guestAuthor
        ?.displayName ??
      null,
    guestIpDisplay:
      (post as { guestIpDisplay?: string | null }).guestIpDisplay ??
      (post as {
        guestAuthor?: { ipDisplay?: string | null; ipLabel?: string | null } | null;
      }).guestAuthor?.ipDisplay ??
      null,
    guestIpLabel:
      (post as { guestIpLabel?: string | null }).guestIpLabel ??
      (post as {
        guestAuthor?: { ipDisplay?: string | null; ipLabel?: string | null } | null;
      }).guestAuthor?.ipLabel ??
      null,
    neighborhood: post.neighborhood
      ? {
          id: post.neighborhood.id,
          name: post.neighborhood.name,
          city: post.neighborhood.city,
          district: post.neighborhood.district,
        }
      : null,
    images: post.images.map((image) => ({ id: image.id })),
    reactions: post.reactions?.map((reaction) => ({ type: reaction.type })) ?? [],
  }));

  const queryKey = [
    "breed-lounge",
    breedCode,
    query.q ?? "",
    query.sort ?? "LATEST",
    query.days ?? "ALL_TIME",
    query.type ?? "ALL",
  ].join("|");

  return (
    <main className="mx-auto w-full max-w-[1160px] px-4 py-5 sm:px-6">
      <section className="border border-[#c8d7ef] bg-[linear-gradient(180deg,#f7faff_0%,#edf3ff_100%)] p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#4b6b9b]">Breed Lounge</p>
        <h1 className="mt-1 text-2xl font-bold text-[#10284a]">{breedCode} 라운지</h1>
        <p className="mt-2 text-sm text-[#49648c]">
          같은 품종 보호자들의 질문/후기/공동구매 글을 모아봅니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/lounges/breeds/${breedCode}/groupbuys/new`}
            className="inline-flex h-8 items-center border border-[#3567b5] bg-[#3567b5] px-3 text-xs font-semibold text-white"
          >
            공동구매 템플릿 작성
          </Link>
          <Link
            href="/feed"
            className="inline-flex h-8 items-center border border-[#bfd0ec] bg-white px-3 text-xs font-semibold text-[#315484]"
          >
            피드로 이동
          </Link>
        </div>
      </section>

      <section className="mt-3 border border-[#c8d7ef] bg-white p-3 sm:p-4">
        <form className="flex flex-wrap gap-2" method="GET">
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="라운지 검색"
            className="h-8 min-w-[220px] border border-[#bfd0ec] px-3 text-sm"
          />
          <button
            type="submit"
            className="inline-flex h-8 items-center border border-[#3567b5] bg-[#3567b5] px-3 text-xs font-semibold text-white"
          >
            검색
          </button>
          <Link
            href={toHref({ breedCode })}
            className="inline-flex h-8 items-center border border-[#bfd0ec] bg-white px-3 text-xs font-semibold text-[#315484]"
          >
            초기화
          </Link>
        </form>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {["LATEST", "LIKE", "COMMENT"].map((sort) => {
            const selected = (query.sort ?? "LATEST") === sort;
            return (
              <Link
                key={`sort-${sort}`}
                href={toHref({
                  breedCode,
                  q: query.q,
                  sort: sort as "LATEST" | "LIKE" | "COMMENT",
                  days: query.days,
                  type: query.type,
                })}
                className={`border px-2.5 py-1 text-xs font-semibold ${
                  selected
                    ? "border-[#3567b5] bg-[#3567b5] text-white"
                    : "border-[#b9cbeb] bg-white text-[#2f548f]"
                }`}
              >
                {sort === "LATEST" ? "최신순" : sort === "LIKE" ? "좋아요순" : "댓글순"}
              </Link>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            href={toHref({ breedCode, q: query.q, sort: query.sort, type: query.type })}
            className={`border px-2.5 py-1 text-xs font-semibold ${
              !query.days
                ? "border-[#3567b5] bg-[#3567b5] text-white"
                : "border-[#b9cbeb] bg-white text-[#2f548f]"
            }`}
          >
            전체 기간
          </Link>
          {[3, 7, 30].map((day) => (
            <Link
              key={`day-${day}`}
              href={toHref({
                breedCode,
                q: query.q,
                sort: query.sort,
                days: day as 3 | 7 | 30,
                type: query.type,
              })}
              className={`border px-2.5 py-1 text-xs font-semibold ${
                query.days === day
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#b9cbeb] bg-white text-[#2f548f]"
              }`}
            >
              최근 {day}일
            </Link>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link
            href={toHref({ breedCode, q: query.q, sort: query.sort, days: query.days })}
            className={`border px-2.5 py-1 text-xs font-semibold ${
              !query.type
                ? "border-[#3567b5] bg-[#3567b5] text-white"
                : "border-[#b9cbeb] bg-white text-[#2f548f]"
            }`}
          >
            전체
          </Link>
          {LOUNGE_TYPES.map((type) => (
            <Link
              key={`type-${type}`}
              href={toHref({ breedCode, q: query.q, sort: query.sort, days: query.days, type })}
              className={`border px-2.5 py-1 text-xs font-semibold ${
                query.type === type
                  ? "border-[#3567b5] bg-[#3567b5] text-white"
                  : "border-[#b9cbeb] bg-white text-[#2f548f]"
              }`}
            >
              {postTypeMeta[type].label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-3 border border-[#c8d7ef] bg-white">
        {initialItems.length === 0 ? (
          <EmptyState
            title="라운지 게시글이 없습니다"
            description="첫 글을 작성하거나 필터를 변경해 보세요."
            actionHref={`/lounges/breeds/${breedCode}/groupbuys/new`}
            actionLabel="공동구매 템플릿 작성"
          />
        ) : (
          <FeedInfiniteList
            initialItems={initialItems}
            initialNextCursor={data.nextCursor}
            mode="ALL"
            query={{
              type: query.type,
              scope: PostScope.GLOBAL,
              q: query.q,
              searchIn: query.searchIn,
              sort: query.sort,
              days: query.days,
              personalized: Boolean(viewerId) && query.personalized,
            }}
            queryKey={queryKey}
            apiPath={`/api/lounges/breeds/${breedCode}/posts`}
          />
        )}
      </section>
    </main>
  );
}
