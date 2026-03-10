import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  attachUploadUrls,
  releaseUploadUrlsIfUnreferenced,
} from "@/server/upload-asset.service";
import {
  updateProfile,
  updateProfileImage,
} from "@/server/services/user.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/server/upload-asset.service", () => ({
  attachUploadUrls: vi.fn(),
  releaseUploadUrlsIfUnreferenced: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const mockAttachUploadUrls = vi.mocked(attachUploadUrls);
const mockReleaseUploadUrlsIfUnreferenced = vi.mocked(releaseUploadUrlsIfUnreferenced);

describe("user service", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.update.mockReset();
    mockAttachUploadUrls.mockReset();
    mockReleaseUploadUrlsIfUnreferenced.mockReset();
    mockAttachUploadUrls.mockResolvedValue(1 as never);
    mockReleaseUploadUrlsIfUnreferenced.mockResolvedValue({
      deletedUrls: [],
      skippedUrls: [],
    } as never);
  });

  it("blocks nickname change within 30 days", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "old-name",
        nicknameUpdatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      })
      .mockResolvedValueOnce(null);

    await expect(
      updateProfile({
        userId: "user-1",
        input: { nickname: "new-name", bio: "hello" },
      }),
    ).rejects.toMatchObject({
      code: "NICKNAME_CHANGE_RATE_LIMITED",
      status: 429,
    });
  });

  it("allows nickname change after 30 days", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "old-name",
        nicknameUpdatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        showPublicPosts: true,
        showPublicComments: true,
        showPublicPets: true,
      })
      .mockResolvedValueOnce(null);
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    await updateProfile({
      userId: "user-1",
      input: {
        nickname: "new-name",
        bio: "hello",
        showPublicPosts: false,
        showPublicComments: true,
        showPublicPets: false,
      },
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nickname: "new-name",
          nicknameUpdatedAt: expect.any(Date),
          showPublicPosts: false,
          showPublicComments: true,
          showPublicPets: false,
        }),
      }),
    );
  });

  it("does not apply cooldown when nickname is unchanged", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "same-name",
        nicknameUpdatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        showPublicPosts: true,
        showPublicComments: false,
        showPublicPets: true,
      })
      .mockResolvedValueOnce({ id: "user-1" });
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    await updateProfile({
      userId: "user-1",
      input: { nickname: "same-name", bio: "updated" },
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nicknameUpdatedAt: undefined,
          showPublicPosts: true,
          showPublicComments: false,
          showPublicPets: true,
        }),
      }),
    );
  });

  it("blocks duplicate nickname", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "old-name",
        nicknameUpdatedAt: null,
        showPublicPosts: true,
        showPublicComments: true,
        showPublicPets: true,
      })
      .mockResolvedValueOnce({ id: "user-2" });

    await expect(
      updateProfile({
        userId: "user-1",
        input: { nickname: "taken-name", bio: "hello" },
      }),
    ).rejects.toMatchObject({
      code: "NICKNAME_TAKEN",
      status: 409,
    });
  });

  it("preserves existing profile visibility when omitted from payload", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        nickname: "same-name",
        nicknameUpdatedAt: null,
        showPublicPosts: false,
        showPublicComments: true,
        showPublicPets: false,
      })
      .mockResolvedValueOnce({ id: "user-1" });
    mockPrisma.user.update.mockResolvedValue({ id: "user-1" });

    await updateProfile({
      userId: "user-1",
      input: { nickname: "same-name", bio: "updated" },
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          showPublicPosts: false,
          showPublicComments: true,
          showPublicPets: false,
        }),
      }),
    );
  });

  it("updates profile image and releases replaced upload url", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      image: "/uploads/old-avatar.png",
    });
    mockPrisma.user.update.mockResolvedValue({
      id: "user-1",
      image: "/media/uploads/new-avatar.png",
    });

    const result = await updateProfileImage({
      userId: "user-1",
      input: { imageUrl: "/uploads/new-avatar.png" },
    });

    expect(result).toEqual({
      id: "user-1",
      image: "/media/uploads/new-avatar.png",
    });
    expect(mockAttachUploadUrls).toHaveBeenCalledWith(["/media/uploads/new-avatar.png"]);
    expect(mockReleaseUploadUrlsIfUnreferenced).toHaveBeenCalledWith([
      "/uploads/old-avatar.png",
    ]);
  });
});
