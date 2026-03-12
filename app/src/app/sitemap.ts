import type { MetadataRoute } from "next";
import { PostScope, PostStatus } from "@prisma/client";

import { hasBreedLoungeRoute } from "@/lib/pet-profile";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";
import { listEffectiveBreedCatalogGroupedBySpecies } from "@/server/queries/breed-catalog.queries";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";

const SITEMAP_POST_PAGE_SIZE = 5_000;

async function getPublicSitemapPostWhere() {
  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();
  return {
    status: PostStatus.ACTIVE,
    scope: PostScope.GLOBAL,
    type: {
      notIn: loginRequiredTypes,
    },
  } as const;
}

export async function generateSitemaps() {
  const where = await getPublicSitemapPostWhere();
  const totalCount = await prisma.post.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / SITEMAP_POST_PAGE_SIZE));

  return Array.from({ length: totalPages }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<number | string>;
}): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = getSiteOrigin();
  const resolvedId = Math.max(0, Number(await id) || 0);
  const where = await getPublicSitemapPostWhere();
  const posts = await prisma.post.findMany({
    where,
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: resolvedId * SITEMAP_POST_PAGE_SIZE,
    take: SITEMAP_POST_PAGE_SIZE,
  });

  const staticRoutes: MetadataRoute.Sitemap =
    resolvedId === 0
      ? [
          {
            url: `${siteOrigin}/`,
            changeFrequency: "hourly",
            priority: 1,
          },
          {
            url: `${siteOrigin}/feed`,
            changeFrequency: "hourly",
            priority: 0.9,
          },
          {
            url: `${siteOrigin}/search`,
            changeFrequency: "daily",
            priority: 0.7,
          },
        ]
      : [];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteOrigin}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const breedRoutes: MetadataRoute.Sitemap =
    resolvedId === 0
      ? Array.from(
          new Set(
            Object.values(await listEffectiveBreedCatalogGroupedBySpecies())
              .flat()
              .map((entry) => entry.code)
              .filter((breedCode) => hasBreedLoungeRoute(breedCode)),
          ),
        ).map((breedCode) => ({
          url: `${siteOrigin}/lounges/breeds/${breedCode}`,
          changeFrequency: "daily",
          priority: 0.6,
        }))
      : [];

  return [...staticRoutes, ...breedRoutes, ...postRoutes];
}
