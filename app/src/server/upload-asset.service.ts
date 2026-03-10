import { del } from "@vercel/blob";
import {
  PostStatus,
  UploadAssetStatus,
  UploadStorageProvider,
} from "@prisma/client";
import { unlink } from "fs/promises";
import path from "path";

import { runtimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  getTrustedUploadPathname,
  getTrustedUploadStorageProvider,
  getUploadProxyPath,
  isTrustedUploadUrl,
} from "@/lib/upload-url";

const DEFAULT_TEMP_UPLOAD_RETENTION_HOURS = 24;

type RegisterUploadAssetParams = {
  url: string;
  mimeType: string;
  size: number;
  ownerUserId?: string | null;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

function normalizeTrustedUploadUrls(urls: string[]) {
  return Array.from(
    new Set(urls.map((url) => url.trim()).filter((url) => isTrustedUploadUrl(url))),
  );
}

function normalizeTrustedUploadStorageKeys(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((url) => getTrustedUploadPathname(url))
        .filter((storageKey): storageKey is string => Boolean(storageKey)),
    ),
  );
}

export function resolveUploadTemporaryRetentionHours(
  raw = process.env.UPLOAD_TEMP_RETENTION_HOURS,
) {
  const retentionHours = Number(raw ?? String(DEFAULT_TEMP_UPLOAD_RETENTION_HOURS));
  if (!Number.isFinite(retentionHours) || retentionHours <= 0) {
    throw new Error("UPLOAD_TEMP_RETENTION_HOURS must be a positive number.");
  }

  return retentionHours;
}

export function buildUploadTemporaryCutoff(retentionHours: number, now = new Date()) {
  return new Date(now.getTime() - retentionHours * 60 * 60 * 1000);
}

export async function registerUploadAsset({
  url,
  mimeType,
  size,
  ownerUserId = null,
  thumbnailUrl = null,
  width = null,
  height = null,
}: RegisterUploadAssetParams) {
  const storageKey = getTrustedUploadPathname(url);
  const storageProvider = getTrustedUploadStorageProvider(url);
  const thumbnailStorageKey = thumbnailUrl
    ? getTrustedUploadPathname(thumbnailUrl)
    : null;

  if (!storageKey || !storageProvider) {
    throw new Error(`Untrusted upload url cannot be registered: ${url}`);
  }
  if (thumbnailUrl && !thumbnailStorageKey) {
    throw new Error(`Untrusted upload thumbnail url cannot be registered: ${thumbnailUrl}`);
  }

  return prisma.uploadAsset.upsert({
    where: { url },
    update: {
      storageKey,
      thumbnailUrl,
      thumbnailStorageKey,
      storageProvider: storageProvider as UploadStorageProvider,
      mimeType,
      size,
      width,
      height,
      ownerUserId,
      status: UploadAssetStatus.TEMPORARY,
      deletedAt: null,
    },
    create: {
      url,
      storageKey,
      thumbnailUrl,
      thumbnailStorageKey,
      storageProvider: storageProvider as UploadStorageProvider,
      mimeType,
      size,
      width,
      height,
      ownerUserId,
      status: UploadAssetStatus.TEMPORARY,
    },
    select: {
      id: true,
      url: true,
      status: true,
    },
  });
}

export async function attachUploadUrls(urls: string[]) {
  const trustedStorageKeys = normalizeTrustedUploadStorageKeys(urls);
  if (trustedStorageKeys.length === 0) {
    return 0;
  }

  const result = await prisma.uploadAsset.updateMany({
    where: {
      storageKey: {
        in: trustedStorageKeys,
      },
    },
    data: {
      status: UploadAssetStatus.ATTACHED,
      attachedAt: new Date(),
      deletedAt: null,
    },
  });

  return result.count;
}

async function findReferencedUploadStorageKeys(urls: string[]) {
  const trustedStorageKeys = normalizeTrustedUploadStorageKeys(urls);
  if (trustedStorageKeys.length === 0) {
    return new Set<string>();
  }

  const relatedAssets = await prisma.uploadAsset.findMany({
    where: {
      OR: [
        {
          storageKey: {
            in: trustedStorageKeys,
          },
        },
        {
          thumbnailStorageKey: {
            in: trustedStorageKeys,
          },
        },
      ],
    },
    select: {
      url: true,
      storageKey: true,
      thumbnailUrl: true,
      thumbnailStorageKey: true,
    },
  });

  const trustedRepresentations = new Set<string>();
  for (const trustedUrl of urls) {
    if (isTrustedUploadUrl(trustedUrl)) {
      trustedRepresentations.add(trustedUrl.trim());
    }
  }
  for (const storageKey of trustedStorageKeys) {
    const proxyPath = getUploadProxyPath(storageKey);
    if (proxyPath) {
      trustedRepresentations.add(proxyPath);
    }
    trustedRepresentations.add(`/${storageKey}`);
  }

  for (const asset of relatedAssets) {
    trustedRepresentations.add(asset.url);
    if (asset.thumbnailUrl) {
      trustedRepresentations.add(asset.thumbnailUrl);
    }
  }

  const [postImages, userImages, petImages] = await Promise.all([
    prisma.postImage.findMany({
      where: {
        url: { in: Array.from(trustedRepresentations) },
        post: {
          status: {
            not: PostStatus.DELETED,
          },
        },
      },
      select: { url: true },
    }),
    prisma.user.findMany({
      where: {
        image: {
          in: Array.from(trustedRepresentations),
        },
      },
      select: { image: true },
    }),
    prisma.pet.findMany({
      where: {
        imageUrl: {
          in: Array.from(trustedRepresentations),
        },
      },
      select: { imageUrl: true },
    }),
  ]);

  const referencedUrls = [
    ...postImages.map((item) => item.url),
    ...userImages.map((item) => item.image).filter((item): item is string => Boolean(item)),
    ...petImages.map((item) => item.imageUrl).filter((item): item is string => Boolean(item)),
  ];

  return new Set<string>(
    referencedUrls
      .map((value) => getTrustedUploadPathname(value))
      .filter((storageKey): storageKey is string => Boolean(storageKey)),
  );
}

async function findUploadAssetByStorageKey(storageKey: string) {
  return prisma.uploadAsset.findFirst({
    where: {
      OR: [
        { storageKey },
        { thumbnailStorageKey: storageKey },
      ],
    },
    select: {
      url: true,
      storageKey: true,
      thumbnailUrl: true,
      thumbnailStorageKey: true,
      storageProvider: true,
    },
  });
}

export async function findStoredUploadSourceByPathname(storageKey: string) {
  const asset = await findUploadAssetByStorageKey(storageKey);
  if (!asset) {
    return null;
  }

  const isThumbnail = asset.thumbnailStorageKey === storageKey && Boolean(asset.thumbnailUrl);
  return {
    sourceUrl: isThumbnail && asset.thumbnailUrl ? asset.thumbnailUrl : asset.url,
    storageProvider: asset.storageProvider,
  };
}

async function deleteStoredUploadUrl(url: string) {
  const storageKey = getTrustedUploadPathname(url);
  const storageProvider = getTrustedUploadStorageProvider(url);

  if (!storageKey || !storageProvider) {
    return false;
  }

  if (storageProvider === "BLOB") {
    await del(url, runtimeEnv.blobReadWriteToken ? { token: runtimeEnv.blobReadWriteToken } : undefined);
    return true;
  }

  const absolutePath = path.join(process.cwd(), "public", ...storageKey.split("/"));
  try {
    await unlink(absolutePath);
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  return true;
}

export async function releaseUploadUrlsIfUnreferenced(urls: string[]) {
  const trustedUrls = normalizeTrustedUploadUrls(urls);
  if (trustedUrls.length === 0) {
    return { deletedUrls: [] as string[], skippedUrls: [] as string[] };
  }

  const referencedStorageKeys = await findReferencedUploadStorageKeys(trustedUrls);
  const releasableEntries = trustedUrls
    .map((url) => ({
      url,
      storageKey: getTrustedUploadPathname(url),
    }))
    .filter(
      (entry): entry is { url: string; storageKey: string } =>
        typeof entry.storageKey === "string" && !referencedStorageKeys.has(entry.storageKey),
    )
    .filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.storageKey === entry.storageKey) === index,
    );
  const deletedUrls: string[] = [];
  const skippedUrls: string[] = [];

  for (const entry of releasableEntries) {
    try {
      const asset = await findUploadAssetByStorageKey(entry.storageKey);
      const deleteTargetUrl =
        asset?.url ?? (entry.url.startsWith("/media/") ? `/${entry.storageKey}` : entry.url);
      await deleteStoredUploadUrl(deleteTargetUrl);
      if (asset?.thumbnailUrl) {
        await deleteStoredUploadUrl(asset.thumbnailUrl);
      }
      await prisma.uploadAsset.updateMany({
        where: { storageKey: entry.storageKey },
        data: {
          status: UploadAssetStatus.DELETED,
          deletedAt: new Date(),
        },
      });
      deletedUrls.push(entry.url);
    } catch {
      skippedUrls.push(entry.url);
    }
  }

  return { deletedUrls, skippedUrls };
}

export async function cleanupTemporaryUploadAssets(params?: {
  retentionHours?: number;
  limit?: number;
  now?: Date;
}) {
  const retentionHours =
    params?.retentionHours ?? resolveUploadTemporaryRetentionHours();
  const cutoff = buildUploadTemporaryCutoff(retentionHours, params?.now);
  const limit = Math.max(1, Math.min(params?.limit ?? 100, 500));

  const temporaryAssets = await prisma.uploadAsset.findMany({
    where: {
      status: UploadAssetStatus.TEMPORARY,
      createdAt: {
        lt: cutoff,
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { url: true },
  });

  const urls = temporaryAssets.map((asset) => asset.url);
  const result = await releaseUploadUrlsIfUnreferenced(urls);

  return {
    cutoff,
    scannedCount: urls.length,
    deletedCount: result.deletedUrls.length,
    skippedCount: result.skippedUrls.length,
  };
}
