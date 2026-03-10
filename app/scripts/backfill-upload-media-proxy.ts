import "dotenv/config";

import { UploadAssetStatus } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  getTrustedUploadPathname,
  getTrustedUploadStorageProvider,
  getUploadProxyPath,
} from "../src/lib/upload-url";

const BLOB_UPLOAD_URL_PATTERN =
  /https:\/\/[A-Za-z0-9.-]+\.public\.blob\.vercel-storage\.com\/uploads\/[^\s"'<>)]*/g;
const LOCAL_UPLOAD_URL_PATTERN = /(?<!\/media)\/uploads\/[^\s"'<>)]*/g;

function inferMimeTypeFromStorageKey(storageKey: string) {
  const extension = storageKey.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "gif") {
    return "image/gif";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "avif") {
    return "image/avif";
  }
  if (extension === "heic") {
    return "image/heic";
  }
  if (extension === "heif") {
    return "image/heif";
  }

  return "application/octet-stream";
}

function collectLegacyUploadUrls(content: string) {
  return Array.from(
    new Set([
      ...(content.match(BLOB_UPLOAD_URL_PATTERN) ?? []),
      ...(content.match(LOCAL_UPLOAD_URL_PATTERN) ?? []),
    ]),
  );
}

function buildProxyMappings(urls: string[]) {
  const mappings = new Map<string, string>();

  for (const url of urls) {
    const storageProvider = getTrustedUploadStorageProvider(url);
    const proxyPath = getUploadProxyPath(url);
    if (!storageProvider || !proxyPath || proxyPath === url) {
      continue;
    }

    mappings.set(url, proxyPath);
  }

  return mappings;
}

function applyProxyMappings(content: string, mappings: Map<string, string>) {
  let nextContent = content;

  for (const [from, to] of mappings.entries()) {
    nextContent = nextContent.split(from).join(to);
  }

  return nextContent;
}

async function ensureUploadAssetsFromUrls(urls: string[], dryRun: boolean) {
  const uniqueUrls = Array.from(new Set(urls));
  let registeredCount = 0;

  for (const url of uniqueUrls) {
    const storageKey = getTrustedUploadPathname(url);
    const storageProvider = getTrustedUploadStorageProvider(url);
    if (!storageKey || !storageProvider) {
      continue;
    }

    registeredCount += 1;
    if (dryRun) {
      continue;
    }

    await prisma.uploadAsset.upsert({
      where: { storageKey },
      update: {
        url,
        storageProvider,
        mimeType: inferMimeTypeFromStorageKey(storageKey),
        size: 0,
        status: UploadAssetStatus.ATTACHED,
        attachedAt: new Date(),
        deletedAt: null,
      },
      create: {
        url,
        storageKey,
        storageProvider,
        mimeType: inferMimeTypeFromStorageKey(storageKey),
        size: 0,
        status: UploadAssetStatus.ATTACHED,
        attachedAt: new Date(),
      },
    });
  }

  return registeredCount;
}

async function main() {
  const dryRun = process.env.UPLOAD_MEDIA_PROXY_BACKFILL_DRY_RUN === "1";

  const [postImages, users, pets, posts] = await Promise.all([
    prisma.postImage.findMany({
      select: { id: true, url: true },
    }),
    prisma.user.findMany({
      where: { image: { not: null } },
      select: { id: true, image: true },
    }),
    prisma.pet.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, imageUrl: true },
    }),
    prisma.post.findMany({
      select: { id: true, content: true },
    }),
  ]);

  const contentUrls = posts.flatMap((post) => collectLegacyUploadUrls(post.content ?? ""));
  const fieldUrls = [
    ...postImages.map((item) => item.url),
    ...users.map((user) => user.image).filter((value): value is string => Boolean(value)),
    ...pets.map((pet) => pet.imageUrl).filter((value): value is string => Boolean(value)),
  ];
  const allLegacyUrls = Array.from(new Set([...fieldUrls, ...contentUrls]));
  const proxyMappings = buildProxyMappings(allLegacyUrls);
  const registeredAssetCount = await ensureUploadAssetsFromUrls(
    Array.from(proxyMappings.keys()),
    dryRun,
  );

  let updatedPostImageCount = 0;
  let updatedUserImageCount = 0;
  let updatedPetImageCount = 0;
  let updatedPostContentCount = 0;

  for (const image of postImages) {
    const proxyPath = proxyMappings.get(image.url);
    if (!proxyPath) {
      continue;
    }

    updatedPostImageCount += 1;
    if (!dryRun) {
      await prisma.postImage.update({
        where: { id: image.id },
        data: { url: proxyPath },
      });
    }
  }

  for (const user of users) {
    const currentImage = user.image;
    if (!currentImage) {
      continue;
    }

    const proxyPath = proxyMappings.get(currentImage);
    if (!proxyPath) {
      continue;
    }

    updatedUserImageCount += 1;
    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id },
        data: { image: proxyPath },
      });
    }
  }

  for (const pet of pets) {
    const currentImage = pet.imageUrl;
    if (!currentImage) {
      continue;
    }

    const proxyPath = proxyMappings.get(currentImage);
    if (!proxyPath) {
      continue;
    }

    updatedPetImageCount += 1;
    if (!dryRun) {
      await prisma.pet.update({
        where: { id: pet.id },
        data: { imageUrl: proxyPath },
      });
    }
  }

  for (const post of posts) {
    const nextContent = applyProxyMappings(post.content ?? "", proxyMappings);
    if (nextContent === post.content) {
      continue;
    }

    updatedPostContentCount += 1;
    if (!dryRun) {
      await prisma.post.update({
        where: { id: post.id },
        data: { content: nextContent },
      });
    }
  }

  console.log("Upload media proxy backfill");
  console.log(`- dryRun: ${dryRun ? "yes" : "no"}`);
  console.log(`- registeredAssets: ${registeredAssetCount}`);
  console.log(`- updatedPostImages: ${updatedPostImageCount}`);
  console.log(`- updatedUserImages: ${updatedUserImageCount}`);
  console.log(`- updatedPetImages: ${updatedPetImageCount}`);
  console.log(`- updatedPostContent: ${updatedPostContentCount}`);
  console.log(`- legacyUrlsSeen: ${allLegacyUrls.length}`);
}

main()
  .catch((error) => {
    console.error("Upload media proxy backfill failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
