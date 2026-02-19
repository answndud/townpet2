import type { MetadataRoute } from "next";
import { PostScope, PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = getSiteOrigin();
  const loginRequiredTypes = await getGuestReadLoginRequiredPostTypes();

  const posts = await prisma.post.findMany({
    where: {
      status: PostStatus.ACTIVE,
      scope: PostScope.GLOBAL,
      type: {
        notIn: loginRequiredTypes,
      },
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 5000,
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteOrigin}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${siteOrigin}/feed`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteOrigin}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteOrigin}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...postRoutes];
}
