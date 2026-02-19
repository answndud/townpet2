import {
  PostReactionType,
  PostScope,
  PostStatus,
  PostType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/server/logger";

const NO_VIEWER_ID = "__NO_VIEWER__";
export type PostListSort = "LATEST" | "LIKE" | "COMMENT";
export type PostSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
const DEFAULT_POST_LIST_SORT: PostListSort = "LATEST";
const DEFAULT_POST_SEARCH_IN: PostSearchIn = "ALL";
const SEARCH_SIMILARITY_THRESHOLD = 0.12;
let postReactionsFieldSupport: boolean | null = null;
let pgTrgmSupport: boolean | null = null;
let pgTrgmSupportWarned = false;

async function supportsPgTrgm() {
  if (pgTrgmSupport !== null) {
    return pgTrgmSupport;
  }

  try {
    const result = await prisma.$queryRaw<Array<{ enabled: boolean }>>(Prisma.sql`
      SELECT EXISTS(
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_trgm'
      ) AS enabled
    `);
    pgTrgmSupport = Boolean(result[0]?.enabled);
  } catch (error) {
    pgTrgmSupport = false;
    if (!pgTrgmSupportWarned) {
      pgTrgmSupportWarned = true;
      logger.warn("pg_trgm 확장 지원 여부 확인에 실패해 trigram 검색을 비활성화합니다.", {
        error: serializeError(error),
      });
    }
  }

  if (!pgTrgmSupport && !pgTrgmSupportWarned) {
    pgTrgmSupportWarned = true;
    logger.warn(
      "pg_trgm 확장이 설치되지 않아 trigram 유사도 검색을 비활성화합니다. 마이그레이션으로 확장을 적용해 주세요.",
    );
  }

  return pgTrgmSupport;
}

const buildPostListInclude = (viewerId?: string) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
    },
    hospitalReview: {
      select: {
        hospitalName: true,
        totalCost: true,
        waitTime: true,
        rating: true,
      },
    },
    placeReview: {
      select: {
        placeName: true,
        placeType: true,
        address: true,
        isPetAllowed: true,
        rating: true,
      },
    },
    walkRoute: {
      select: {
        routeName: true,
        distance: true,
        duration: true,
        difficulty: true,
        hasStreetLights: true,
        hasRestroom: true,
        hasParkingLot: true,
        safetyTags: true,
      },
    },
    images: {
      select: { id: true, url: true, order: true },
      orderBy: { order: "asc" },
    },
  }) as const;

const buildPostListIncludeWithoutReactions = () =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    hospitalReview: {
      select: {
        hospitalName: true,
        totalCost: true,
        waitTime: true,
        rating: true,
      },
    },
    placeReview: {
      select: {
        placeName: true,
        placeType: true,
        address: true,
        isPetAllowed: true,
        rating: true,
      },
    },
    walkRoute: {
      select: {
        routeName: true,
        distance: true,
        duration: true,
        difficulty: true,
        hasStreetLights: true,
        hasRestroom: true,
        hasParkingLot: true,
        safetyTags: true,
      },
    },
    images: {
      select: { id: true, url: true, order: true },
      orderBy: { order: "asc" },
    },
  }) as const;

const buildPostDetailInclude = (viewerId?: string) =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    reactions: {
      where: {
        userId: viewerId ?? NO_VIEWER_ID,
      },
      select: { type: true },
    },
    hospitalReview: {
      select: {
        hospitalName: true,
        totalCost: true,
        waitTime: true,
        rating: true,
        treatmentType: true,
      },
    },
    placeReview: {
      select: {
        placeName: true,
        placeType: true,
        address: true,
        isPetAllowed: true,
        rating: true,
      },
    },
    walkRoute: {
      select: {
        routeName: true,
        distance: true,
        duration: true,
        difficulty: true,
        hasStreetLights: true,
        hasRestroom: true,
        hasParkingLot: true,
        safetyTags: true,
      },
    },
    images: {
      select: { id: true, url: true, order: true },
      orderBy: { order: "asc" },
    },
  }) as const;

const buildPostDetailIncludeWithoutReactions = () =>
  ({
    author: { select: { id: true, name: true, nickname: true, image: true } },
    neighborhood: {
      select: { id: true, name: true, city: true, district: true },
    },
    hospitalReview: {
      select: {
        hospitalName: true,
        totalCost: true,
        waitTime: true,
        rating: true,
        treatmentType: true,
      },
    },
    placeReview: {
      select: {
        placeName: true,
        placeType: true,
        address: true,
        isPetAllowed: true,
        rating: true,
      },
    },
    walkRoute: {
      select: {
        routeName: true,
        distance: true,
        duration: true,
        difficulty: true,
        hasStreetLights: true,
        hasRestroom: true,
        hasParkingLot: true,
        safetyTags: true,
      },
    },
    images: {
      select: { id: true, url: true, order: true },
      orderBy: { order: "asc" },
    },
  }) as const;

function isUnknownReactionsIncludeError(error: unknown) {
  return error instanceof Error && error.message.includes("Unknown field `reactions`");
}

function supportsPostReactionsField() {
  if (postReactionsFieldSupport !== null) {
    return postReactionsFieldSupport;
  }

  const runtimeModels = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: Array<{ name: string }> }>;
      };
    }
  )._runtimeDataModel?.models;

  const postFields = runtimeModels?.Post?.fields;
  if (!postFields || postFields.length === 0) {
    // If runtime metadata is unavailable, keep current behavior and fall back via catch.
    postReactionsFieldSupport = true;
    return true;
  }

  postReactionsFieldSupport = postFields.some((field) => field.name === "reactions");
  return postReactionsFieldSupport;
}

function withEmptyReactions<T extends Record<string, unknown>>(items: T[]) {
  return items.map((item) => ({
    ...item,
    reactions: [] as Array<{ type: PostReactionType }>,
  }));
}

function withEmptyReactionsOne<T extends Record<string, unknown> | null>(item: T) {
  if (!item) {
    return null;
  }

  return {
    ...item,
    reactions: [] as Array<{ type: PostReactionType }>,
  };
}

function buildPostSearchWhere(
  q?: string,
  searchIn: PostSearchIn = DEFAULT_POST_SEARCH_IN,
): Prisma.PostWhereInput {
  const trimmedQuery = q?.trim();
  if (!trimmedQuery) {
    return {};
  }

  const titleFilter = { title: { contains: trimmedQuery, mode: "insensitive" as const } };
  const contentFilter = {
    content: { contains: trimmedQuery, mode: "insensitive" as const },
  };
  const authorFilter = {
    author: {
      OR: [
        { nickname: { contains: trimmedQuery, mode: "insensitive" as const } },
        { name: { contains: trimmedQuery, mode: "insensitive" as const } },
      ],
    },
  };

  if (searchIn === "TITLE") {
    return titleFilter;
  }
  if (searchIn === "CONTENT") {
    return contentFilter;
  }
  if (searchIn === "AUTHOR") {
    return authorFilter;
  }

  return {
    OR: [titleFilter, contentFilter, authorFilter],
  };
}

type PostListOptions = {
  cursor?: string;
  limit: number;
  type?: PostType;
  scope: PostScope;
  q?: string;
  searchIn?: PostSearchIn;
  sort?: PostListSort;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

type BestPostListOptions = {
  limit: number;
  days: number;
  type?: PostType;
  scope: PostScope;
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  minLikes?: number;
  viewerId?: string;
};

export async function getPostById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }

  if (!supportsPostReactionsField()) {
    const post = await prisma.post.findUnique({
      where: { id },
      include: buildPostDetailIncludeWithoutReactions(),
    });
    return withEmptyReactionsOne(post);
  }

  try {
    return await prisma.post.findUnique({
      where: { id },
      include: buildPostDetailInclude(viewerId),
    });
  } catch (error) {
    if (!isUnknownReactionsIncludeError(error)) {
      throw error;
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: buildPostDetailIncludeWithoutReactions(),
    });
    return withEmptyReactionsOne(post);
  }
}

export async function listPosts({
  cursor,
  limit,
  type,
  scope,
  q,
  searchIn,
  sort,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: PostListOptions) {
  const normalizedExcludeTypes = excludeTypes ?? [];
  if (type && normalizedExcludeTypes.includes(type)) {
    return { items: [], nextCursor: null };
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const resolvedSort = sort ?? DEFAULT_POST_LIST_SORT;
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    resolvedSort === "LIKE"
      ? [
          { likeCount: "desc" },
          { commentCount: "desc" },
          { createdAt: "desc" },
        ]
      : resolvedSort === "COMMENT"
        ? [
            { commentCount: "desc" },
            { likeCount: "desc" },
            { createdAt: "desc" },
          ]
        : [{ createdAt: "desc" }];

  const baseArgs: Omit<Prisma.PostFindManyArgs, "include"> = {
    where: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(type
        ? { type }
        : normalizedExcludeTypes.length > 0
          ? { type: { notIn: normalizedExcludeTypes } }
          : {}),
      scope,
      ...(scope === PostScope.LOCAL && neighborhoodId
        ? { neighborhoodId }
        : scope === PostScope.LOCAL
          ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
          : {}),
      ...buildPostSearchWhere(q, resolvedSearchIn),
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    orderBy,
  };

  if (!supportsPostReactionsField()) {
    const fallbackItems = await prisma.post.findMany({
      ...baseArgs,
      include: buildPostListIncludeWithoutReactions(),
    });
    const items = withEmptyReactions(fallbackItems);
    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { items, nextCursor };
  }

  const items = await prisma.post
    .findMany({
      ...baseArgs,
      include: buildPostListInclude(viewerId),
    })
    .catch(async (error) => {
      if (!isUnknownReactionsIncludeError(error)) {
        throw error;
      }

      const fallbackItems = await prisma.post.findMany({
        ...baseArgs,
        include: buildPostListIncludeWithoutReactions(),
      });
      return withEmptyReactions(fallbackItems);
    });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return { items, nextCursor };
}

export async function listBestPosts({
  limit,
  days,
  type,
  scope,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  minLikes = 1,
  viewerId,
}: BestPostListOptions) {
  const normalizedExcludeTypes = excludeTypes ?? [];
  if (type && normalizedExcludeTypes.includes(type)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const baseArgs: Omit<Prisma.PostFindManyArgs, "include"> = {
    where: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(type
        ? { type }
        : normalizedExcludeTypes.length > 0
          ? { type: { notIn: normalizedExcludeTypes } }
          : {}),
      scope,
      ...(scope === PostScope.LOCAL && neighborhoodId
        ? { neighborhoodId }
        : scope === PostScope.LOCAL
          ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
          : {}),
      ...buildPostSearchWhere(q, resolvedSearchIn),
      likeCount: { gte: minLikes },
      createdAt: { gte: since },
    },
    take: limit,
    orderBy: [
      { likeCount: "desc" },
      { commentCount: "desc" },
      { viewCount: "desc" },
      { createdAt: "desc" },
    ],
  };

  if (!supportsPostReactionsField()) {
    const fallbackItems = await prisma.post.findMany({
      ...baseArgs,
      include: buildPostListIncludeWithoutReactions(),
    });
    return withEmptyReactions(fallbackItems);
  }

  return prisma.post
    .findMany({
      ...baseArgs,
      include: buildPostListInclude(viewerId),
    })
    .catch(async (error) => {
      if (!isUnknownReactionsIncludeError(error)) {
        throw error;
      }

      const fallbackItems = await prisma.post.findMany({
        ...baseArgs,
        include: buildPostListIncludeWithoutReactions(),
      });
      return withEmptyReactions(fallbackItems);
    });
}

type UserPostListOptions = {
  authorId: string;
  scope?: PostScope;
  type?: PostType;
  q?: string;
};

export async function listUserPosts({
  authorId,
  scope,
  type,
  q,
}: UserPostListOptions) {
  return prisma.post.findMany({
    where: {
      authorId,
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(scope ? { scope } : {}),
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
      },
      hospitalReview: {
        select: { hospitalName: true, rating: true },
      },
      placeReview: {
        select: { placeName: true, rating: true, isPetAllowed: true },
      },
      walkRoute: {
        select: { routeName: true, distance: true },
      },
    },
  });
}

type PostSearchSuggestionOptions = {
  q: string;
  limit: number;
  type?: PostType;
  scope: PostScope;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
};

type RankedPostSearchOptions = {
  limit: number;
  type?: PostType;
  scope: PostScope;
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

function buildRankedSearchWhereSql({
  scope,
  type,
  excludeTypes,
  neighborhoodId,
  searchSql,
}: {
  scope: PostScope;
  type?: PostType;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  searchSql: Prisma.Sql;
}) {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`p."status" IN ('ACTIVE'::"PostStatus", 'HIDDEN'::"PostStatus")`,
    Prisma.sql`p."scope"::text = ${scope}`,
    searchSql,
  ];

  if (type) {
    clauses.push(Prisma.sql`p."type"::text = ${type}`);
  } else if (excludeTypes.length > 0) {
    const excludedSql = Prisma.join(excludeTypes);
    clauses.push(Prisma.sql`p."type"::text NOT IN (${excludedSql})`);
  }

  if (scope === PostScope.LOCAL) {
    clauses.push(
      Prisma.sql`p."neighborhoodId" = ${neighborhoodId ?? "__NO_NEIGHBORHOOD__"}`,
    );
  }

  return Prisma.join(clauses, " AND ");
}

function buildRankedSearchMatchSql(
  searchIn: PostSearchIn,
  query: string,
  pattern: string,
  compactPattern: string,
  useTrigram: boolean,
) {
  const compactQuery = query.replace(/\s+/g, "");
  const titleSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(p."title", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const titleCompactSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(REPLACE(COALESCE(p."title", ''), ' ', ''), ${compactQuery}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const contentSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(p."content", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const authorNicknameSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(u."nickname", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;
  const authorNameSimilaritySql = useTrigram
    ? Prisma.sql`OR similarity(COALESCE(u."name", ''), ${query}) >= ${SEARCH_SIMILARITY_THRESHOLD}`
    : Prisma.sql``;

  const titleMatch = Prisma.sql`(
    p."title" ILIKE ${pattern}
    OR REPLACE(COALESCE(p."title", ''), ' ', '') ILIKE ${compactPattern}
    OR to_tsvector('simple', COALESCE(p."title", '')) @@ websearch_to_tsquery('simple', ${query})
    OR to_tsvector('simple', REPLACE(COALESCE(p."title", ''), ' ', '')) @@ websearch_to_tsquery('simple', ${compactQuery})
    ${titleSimilaritySql}
    ${titleCompactSimilaritySql}
  )`;

  const contentMatch = Prisma.sql`(
    p."content" ILIKE ${pattern}
    OR to_tsvector('simple', COALESCE(p."content", '')) @@ websearch_to_tsquery('simple', ${query})
    ${contentSimilaritySql}
  )`;

  const authorMatch = Prisma.sql`(
    COALESCE(u."nickname", '') ILIKE ${pattern}
    OR COALESCE(u."name", '') ILIKE ${pattern}
    OR to_tsvector('simple', CONCAT_WS(' ', COALESCE(u."nickname", ''), COALESCE(u."name", ''))) @@ websearch_to_tsquery('simple', ${query})
    ${authorNicknameSimilaritySql}
    ${authorNameSimilaritySql}
  )`;

  if (searchIn === "TITLE") {
    return titleMatch;
  }
  if (searchIn === "CONTENT") {
    return contentMatch;
  }
  if (searchIn === "AUTHOR") {
    return authorMatch;
  }

  return Prisma.sql`(${titleMatch} OR ${contentMatch} OR ${authorMatch})`;
}

type RankedSearchRow = {
  id: string;
};

export async function listRankedSearchPosts({
  limit,
  type,
  scope,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: RankedPostSearchOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmedQuery = q?.trim();
  if (!trimmedQuery) {
    return [];
  }

  const normalizedExcludeTypes = excludeTypes ?? [];
  if (type && normalizedExcludeTypes.includes(type)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const likePattern = `%${trimmedQuery}%`;
  const compactQuery = trimmedQuery.replace(/\s+/g, "");
  const compactPattern = `%${compactQuery}%`;
  const useTrigram = await supportsPgTrgm();
  const searchMatchSql = buildRankedSearchMatchSql(
    resolvedSearchIn,
    trimmedQuery,
    likePattern,
    compactPattern,
    useTrigram,
  );
  const whereSql = buildRankedSearchWhereSql({
    scope,
    type,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    searchSql: searchMatchSql,
  });
  const candidateLimit = Math.min(Math.max(safeLimit * 4, safeLimit), 200);
  const trigramScoreSql = useTrigram
    ? Prisma.sql`+ GREATEST(
          similarity(COALESCE(p."title", ''), ${trimmedQuery}),
          similarity(COALESCE(p."content", ''), ${trimmedQuery}),
          similarity(COALESCE(u."nickname", ''), ${trimmedQuery}),
          similarity(COALESCE(u."name", ''), ${trimmedQuery})
        ) * 4.0`
    : Prisma.sql``;

  try {
    const candidates = await prisma.$queryRaw<RankedSearchRow[]>(Prisma.sql`
      SELECT p."id"
      FROM "Post" p
      INNER JOIN "User" u ON u."id" = p."authorId"
      WHERE ${whereSql}
      ORDER BY
        (
          ts_rank_cd(
            setweight(to_tsvector('simple', COALESCE(p."title", '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(u."nickname", '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(u."name", '')), 'A') ||
            setweight(to_tsvector('simple', COALESCE(p."content", '')), 'B'),
            websearch_to_tsquery('simple', ${trimmedQuery})
          ) * 9.0
          ${trigramScoreSql}
          + CASE WHEN p."title" ILIKE ${likePattern} THEN 1.5 ELSE 0 END
          + CASE
              WHEN REPLACE(COALESCE(p."title", ''), ' ', '') ILIKE ${compactPattern}
              THEN 0.8
              ELSE 0
            END
          + CASE
              WHEN COALESCE(u."nickname", '') ILIKE ${likePattern}
                OR COALESCE(u."name", '') ILIKE ${likePattern}
              THEN 1.0
              ELSE 0
            END
          + GREATEST(
              0,
              1.2 - (EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 86400.0) / 30.0
            )
        ) DESC,
        p."createdAt" DESC
      LIMIT ${candidateLimit}
    `);

    const candidateIds = Array.from(
      new Set(
        candidates
          .map((item) => item.id)
          .filter((value): value is string => typeof value === "string"),
      ),
    );
    if (candidateIds.length === 0) {
      return [];
    }

    const baseArgs: Omit<Prisma.PostFindManyArgs, "include"> = {
      where: { id: { in: candidateIds } },
    };

    const fetchedPosts = !supportsPostReactionsField()
      ? withEmptyReactions(
          await prisma.post.findMany({
            ...baseArgs,
            include: buildPostListIncludeWithoutReactions(),
          }),
        )
      : await prisma.post
          .findMany({
            ...baseArgs,
            include: buildPostListInclude(viewerId),
          })
          .catch(async (error) => {
            if (!isUnknownReactionsIncludeError(error)) {
              throw error;
            }
            const fallbackItems = await prisma.post.findMany({
              ...baseArgs,
              include: buildPostListIncludeWithoutReactions(),
            });
            return withEmptyReactions(fallbackItems);
          });

    const byId = new Map(fetchedPosts.map((item) => [item.id, item]));
    return candidateIds
      .map((id) => byId.get(id))
      .filter((item): item is (typeof fetchedPosts)[number] => Boolean(item))
      .slice(0, safeLimit);
  } catch (error) {
    logger.warn("고급 검색 쿼리 실패로 기본 검색으로 fallback합니다.", {
      query: trimmedQuery,
      searchIn: resolvedSearchIn,
      error: serializeError(error),
    });

    const fallback = await listPosts({
      limit: Math.min(Math.max(safeLimit * 3, safeLimit), 80),
      type,
      scope,
      q: trimmedQuery,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      viewerId,
    });
    return fallback.items.slice(0, safeLimit);
  }
}

export async function listPostSearchSuggestions({
  q,
  limit,
  type,
  scope,
  searchIn,
  excludeTypes,
  neighborhoodId,
}: PostSearchSuggestionOptions) {
  const trimmedQuery = q.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const normalizedExcludeTypes = excludeTypes ?? [];
  if (type && normalizedExcludeTypes.includes(type)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const rows = await prisma.post.findMany({
    where: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(type
        ? { type }
        : normalizedExcludeTypes.length > 0
          ? { type: { notIn: normalizedExcludeTypes } }
          : {}),
      scope,
      ...(scope === PostScope.LOCAL && neighborhoodId
        ? { neighborhoodId }
        : scope === PostScope.LOCAL
          ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
          : {}),
      ...buildPostSearchWhere(trimmedQuery, resolvedSearchIn),
    },
    select: {
      title: true,
      author: {
        select: {
          nickname: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit * 3, limit), 30),
  });

  const lowerQuery = trimmedQuery.toLowerCase();
  const suggestions: string[] = [];
  const seen = new Set<string>();
  const addSuggestion = (value?: string | null) => {
    const normalized = value?.trim();
    if (!normalized) {
      return;
    }
    const lower = normalized.toLowerCase();
    if (!lower.includes(lowerQuery) || seen.has(lower)) {
      return;
    }

    seen.add(lower);
    suggestions.push(normalized);
  };

  for (const row of rows) {
    if (resolvedSearchIn === "AUTHOR") {
      addSuggestion(row.author.nickname);
      addSuggestion(row.author.name);
    } else {
      addSuggestion(row.title);
      if (resolvedSearchIn === "ALL") {
        addSuggestion(row.author.nickname);
        addSuggestion(row.author.name);
      }
    }

    if (suggestions.length >= limit) {
      break;
    }
  }

  return suggestions.slice(0, limit);
}
