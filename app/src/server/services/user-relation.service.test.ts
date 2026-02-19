import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  blockUser,
  muteUser,
  unblockUser,
  unmuteUser,
} from "@/server/services/user-relation.service";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userBlock: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    userMute: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/queries/user-relation.queries", () => ({
  getUserRelationState: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  userBlock: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  userMute: {
    upsert: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

const mockGetUserRelationState = vi.mocked(getUserRelationState);

describe("user relation service", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.userBlock.upsert.mockReset();
    mockPrisma.userBlock.deleteMany.mockReset();
    mockPrisma.userMute.upsert.mockReset();
    mockPrisma.userMute.deleteMany.mockReset();
    mockGetUserRelationState.mockReset();

    mockPrisma.user.findUnique.mockResolvedValue({ id: "clt000000000000000000001" });
    mockGetUserRelationState.mockResolvedValue({
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    });
  });

  it("blocks user and returns relation state", async () => {
    const result = await blockUser({
      userId: "user-1",
      input: { targetUserId: "clt000000000000000000001" },
    });

    expect(mockPrisma.userBlock.upsert).toHaveBeenCalledTimes(1);
    expect(result.isBlockedByMe).toBe(false);
  });

  it("mutes and unmutes user", async () => {
    await muteUser({
      userId: "user-1",
      input: { targetUserId: "clt000000000000000000001" },
    });
    await unmuteUser({
      userId: "user-1",
      input: { targetUserId: "clt000000000000000000001" },
    });

    expect(mockPrisma.userMute.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.userMute.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("unblocks user", async () => {
    await unblockUser({
      userId: "user-1",
      input: { targetUserId: "clt000000000000000000001" },
    });

    expect(mockPrisma.userBlock.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("rejects self relation change", async () => {
    await expect(
      blockUser({
        userId: "clt000000000000000000999",
        input: { targetUserId: "clt000000000000000000999" },
      }),
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
