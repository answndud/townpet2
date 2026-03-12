import { PostScope, PostStatus, PostType, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { canGuestReadPost } from "@/lib/post-access";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";

vi.mock("@/lib/post-access", () => ({ canGuestReadPost: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/user.queries", () => ({
  getUserWithNeighborhoods: vi.fn(),
}));

const mockCanGuestReadPost = vi.mocked(canGuestReadPost);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(
  getGuestReadLoginRequiredPostTypes,
);
const mockGetUserWithNeighborhoods = vi.mocked(getUserWithNeighborhoods);

const globalActivePost = {
  status: PostStatus.ACTIVE,
  scope: PostScope.GLOBAL,
  type: PostType.FREE_POST,
} as const;

describe("assertPostReadable", () => {
  beforeEach(() => {
    mockCanGuestReadPost.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockGetUserWithNeighborhoods.mockReset();

    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockCanGuestReadPost.mockReturnValue(true);
  });

  it("throws POST_NOT_FOUND when status is not ACTIVE", async () => {
    await expect(
      assertPostReadable({
        ...globalActivePost,
        status: PostStatus.HIDDEN,
      }),
    ).rejects.toMatchObject({
      code: "POST_NOT_FOUND",
      status: 404,
    });
  });

  it("allows moderator to read hidden posts when hidden-read option is enabled", async () => {
    await expect(
      assertPostReadable(
        {
          ...globalActivePost,
          status: PostStatus.HIDDEN,
        },
        "mod-1",
        {
          viewerRole: UserRole.ADMIN,
          allowModeratorHiddenRead: true,
        },
      ),
    ).resolves.toBeUndefined();
  });

  it("throws AUTH_REQUIRED for guest when read policy denies", async () => {
    mockCanGuestReadPost.mockReturnValue(false);

    await expect(assertPostReadable(globalActivePost)).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      status: 401,
    });
  });

  it("throws NEIGHBORHOOD_REQUIRED for local user without primary neighborhood", async () => {
    mockGetUserWithNeighborhoods.mockResolvedValue({
      neighborhoods: [],
    } as never);

    await expect(
      assertPostReadable(
        {
          status: PostStatus.ACTIVE,
          scope: PostScope.LOCAL,
          type: PostType.MEETUP,
          neighborhoodId: "neighborhood-1",
        },
        "user-1",
      ),
    ).rejects.toMatchObject({
      code: "NEIGHBORHOOD_REQUIRED",
      status: 400,
    });
  });

  it("throws FORBIDDEN when local neighborhood does not match", async () => {
    mockGetUserWithNeighborhoods.mockResolvedValue({
      neighborhoods: [
        {
          isPrimary: true,
          neighborhood: { id: "neighborhood-2" },
        },
      ],
    } as never);

    await expect(
      assertPostReadable(
        {
          status: PostStatus.ACTIVE,
          scope: PostScope.LOCAL,
          type: PostType.MEETUP,
          neighborhoodId: "neighborhood-1",
        },
        "user-1",
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("allows local post when viewer primary neighborhood matches", async () => {
    mockGetUserWithNeighborhoods.mockResolvedValue({
      neighborhoods: [
        {
          isPrimary: true,
          neighborhood: { id: "neighborhood-1" },
        },
      ],
    } as never);

    await expect(
      assertPostReadable(
        {
          status: PostStatus.ACTIVE,
          scope: PostScope.LOCAL,
          type: PostType.MEETUP,
          neighborhoodId: "neighborhood-1",
        },
        "user-1",
      ),
    ).resolves.toBeUndefined();
  });

  it("allows moderator to bypass local neighborhood check when hidden-read option is enabled", async () => {
    await expect(
      assertPostReadable(
        {
          status: PostStatus.ACTIVE,
          scope: PostScope.LOCAL,
          type: PostType.MEETUP,
          neighborhoodId: "neighborhood-1",
        },
        "mod-1",
        {
          viewerRole: UserRole.MODERATOR,
          allowModeratorHiddenRead: true,
        },
      ),
    ).resolves.toBeUndefined();
    expect(mockGetUserWithNeighborhoods).not.toHaveBeenCalled();
  });
});
