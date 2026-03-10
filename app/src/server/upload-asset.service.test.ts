import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  buildUploadTemporaryCutoff,
  cleanupTemporaryUploadAssets,
  registerUploadAsset,
  releaseUploadUrlsIfUnreferenced,
  resolveUploadTemporaryRetentionHours,
} from "@/server/upload-asset.service";
import { del } from "@vercel/blob";
import { unlink } from "fs/promises";

vi.mock("@/lib/env", () => ({
  runtimeEnv: {
    blobReadWriteToken: "blob-token",
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    uploadAsset: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    postImage: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    pet: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  unlink: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  uploadAsset: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  postImage: {
    findMany: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
  };
  pet: {
    findMany: ReturnType<typeof vi.fn>;
  };
};
const mockDel = vi.mocked(del);
const mockUnlink = vi.mocked(unlink);

describe("upload asset service", () => {
  beforeEach(() => {
    mockPrisma.uploadAsset.upsert.mockReset();
    mockPrisma.uploadAsset.findUnique.mockReset();
    mockPrisma.uploadAsset.findFirst.mockReset();
    mockPrisma.uploadAsset.updateMany.mockReset();
    mockPrisma.uploadAsset.findMany.mockReset();
    mockPrisma.postImage.findMany.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.pet.findMany.mockReset();
    mockDel.mockReset();
    mockUnlink.mockReset();

    mockPrisma.uploadAsset.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.uploadAsset.findUnique.mockResolvedValue(null);
    mockPrisma.uploadAsset.findFirst.mockResolvedValue(null);
    mockPrisma.postImage.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.pet.findMany.mockResolvedValue([]);
    mockPrisma.uploadAsset.findMany.mockResolvedValue([]);
    mockDel.mockResolvedValue(undefined as never);
    mockUnlink.mockResolvedValue(undefined as never);
  });

  it("rejects invalid temporary retention hours", () => {
    expect(() => resolveUploadTemporaryRetentionHours("0")).toThrow(
      "UPLOAD_TEMP_RETENTION_HOURS must be a positive number.",
    );
  });

  it("builds temporary upload cutoff from retention hours", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    expect(buildUploadTemporaryCutoff(24, now).toISOString()).toBe(
      "2026-03-09T12:00:00.000Z",
    );
  });

  it("registers trusted upload assets with storage metadata", async () => {
    mockPrisma.uploadAsset.upsert.mockResolvedValue({
      id: "asset-1",
      url: "/uploads/pet.png",
      status: "TEMPORARY",
    });

    await registerUploadAsset({
      url: "/uploads/pet.png",
      mimeType: "image/png",
      size: 1234,
      ownerUserId: "user-1",
      thumbnailUrl: "/uploads/pet.thumb.webp",
      width: 1024,
      height: 768,
    });

    expect(mockPrisma.uploadAsset.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { url: "/uploads/pet.png" },
        create: expect.objectContaining({
          storageKey: "uploads/pet.png",
          thumbnailStorageKey: "uploads/pet.thumb.webp",
          storageProvider: "LOCAL",
          width: 1024,
          height: 768,
          ownerUserId: "user-1",
        }),
      }),
    );
  });

  it("deletes unreferenced local upload urls", async () => {
    mockPrisma.uploadAsset.findFirst.mockResolvedValue({
      url: "/uploads/orphan.png",
      storageKey: "uploads/orphan.png",
      thumbnailUrl: "/uploads/orphan.thumb.webp",
      thumbnailStorageKey: "uploads/orphan.thumb.webp",
      storageProvider: "LOCAL",
    });

    const result = await releaseUploadUrlsIfUnreferenced(["/uploads/orphan.png"]);

    expect(mockUnlink).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/public/uploads/orphan.png"),
    );
    expect(mockUnlink).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/public/uploads/orphan.thumb.webp"),
    );
    expect(mockPrisma.uploadAsset.updateMany).toHaveBeenCalledWith({
      where: { storageKey: "uploads/orphan.png" },
      data: {
        status: "DELETED",
        deletedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      deletedUrls: ["/uploads/orphan.png"],
      skippedUrls: [],
    });
  });

  it("does not delete upload urls that are still referenced", async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ image: "/media/uploads/avatar.png" }]);

    const result = await releaseUploadUrlsIfUnreferenced(["/uploads/avatar.png"]);

    expect(mockUnlink).not.toHaveBeenCalled();
    expect(mockPrisma.uploadAsset.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedUrls: [],
      skippedUrls: [],
    });
  });

  it("cleans up expired temporary upload assets", async () => {
    mockPrisma.uploadAsset.findMany.mockResolvedValue([
      { url: "/uploads/expired-1.png" },
      { url: "/uploads/expired-2.png" },
    ]);
    mockPrisma.uploadAsset.findFirst
      .mockResolvedValueOnce({
        url: "/uploads/expired-1.png",
        storageKey: "uploads/expired-1.png",
        thumbnailUrl: "/uploads/expired-1.thumb.webp",
        thumbnailStorageKey: "uploads/expired-1.thumb.webp",
        storageProvider: "LOCAL",
      })
      .mockResolvedValueOnce({
        url: "/uploads/expired-2.png",
        storageKey: "uploads/expired-2.png",
        thumbnailUrl: null,
        thumbnailStorageKey: null,
        storageProvider: "LOCAL",
      });

    const result = await cleanupTemporaryUploadAssets({
      retentionHours: 24,
      now: new Date("2026-03-10T12:00:00.000Z"),
    });

    expect(result.scannedCount).toBe(2);
    expect(result.deletedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
  });
});
