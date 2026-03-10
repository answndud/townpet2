import { revalidatePath } from "next/cache";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { unstable_update } from "@/lib/auth";
import {
  bumpFeedCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";
import {
  setPrimaryNeighborhoodAction,
  updateProfileAction,
  updateProfileImageAction,
} from "@/server/actions/user";
import { requireCurrentUser } from "@/server/auth";
import { ServiceError } from "@/server/services/service-error";
import {
  setPrimaryNeighborhood,
  updateProfile,
  updateProfileImage,
} from "@/server/services/user.service";

vi.mock("@/server/auth", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/server/services/user.service", () => ({
  updateProfile: vi.fn(),
  updateProfileImage: vi.fn(),
  setPrimaryNeighborhood: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  unstable_update: vi.fn(),
}));

vi.mock("@/server/cache/query-cache", () => ({
  bumpFeedCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSearchCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSuggestCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpPostDetailCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpPostCommentsCacheVersion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockUpdateProfile = vi.mocked(updateProfile);
const mockUpdateProfileImage = vi.mocked(updateProfileImage);
const mockSetPrimaryNeighborhood = vi.mocked(setPrimaryNeighborhood);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockUnstableUpdate = vi.mocked(unstable_update);
const mockBumpFeedCacheVersion = vi.mocked(bumpFeedCacheVersion);
const mockBumpSearchCacheVersion = vi.mocked(bumpSearchCacheVersion);
const mockBumpSuggestCacheVersion = vi.mocked(bumpSuggestCacheVersion);
const mockBumpPostDetailCacheVersion = vi.mocked(bumpPostDetailCacheVersion);
const mockBumpPostCommentsCacheVersion = vi.mocked(bumpPostCommentsCacheVersion);

describe("user actions", () => {
  beforeEach(() => {
    mockRequireCurrentUser.mockReset();
    mockUpdateProfile.mockReset();
    mockUpdateProfileImage.mockReset();
    mockSetPrimaryNeighborhood.mockReset();
    mockRevalidatePath.mockReset();
    mockUnstableUpdate.mockReset();
    mockBumpFeedCacheVersion.mockReset();
    mockBumpFeedCacheVersion.mockResolvedValue(undefined);
    mockBumpSearchCacheVersion.mockReset();
    mockBumpSearchCacheVersion.mockResolvedValue(undefined);
    mockBumpSuggestCacheVersion.mockReset();
    mockBumpSuggestCacheVersion.mockResolvedValue(undefined);
    mockBumpPostDetailCacheVersion.mockReset();
    mockBumpPostDetailCacheVersion.mockResolvedValue(undefined);
    mockBumpPostCommentsCacheVersion.mockReset();
    mockBumpPostCommentsCacheVersion.mockResolvedValue(undefined);
  });

  it("updates profile and revalidates", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockUpdateProfile.mockResolvedValue({ nickname: "타운펫" } as never);
    mockUnstableUpdate.mockResolvedValue(null);

    const result = await updateProfileAction({
      nickname: "타운펫",
      showPublicPosts: false,
      showPublicComments: true,
      showPublicPets: false,
    });

    expect(result).toEqual({ ok: true });
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      userId: "user-1",
      input: {
        nickname: "타운펫",
        showPublicPosts: false,
        showPublicComments: true,
        showPublicPets: false,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/feed");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/search");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/users/user-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/onboarding");
    expect(mockUnstableUpdate).toHaveBeenCalledWith({
      user: { nickname: "타운펫" },
    });
    expect(mockBumpFeedCacheVersion).toHaveBeenCalled();
    expect(mockBumpSearchCacheVersion).toHaveBeenCalled();
    expect(mockBumpSuggestCacheVersion).toHaveBeenCalled();
    expect(mockBumpPostDetailCacheVersion).toHaveBeenCalled();
    expect(mockBumpPostCommentsCacheVersion).toHaveBeenCalled();
  });

  it("sets primary neighborhood and revalidates", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-2" } as never);

    const result = await setPrimaryNeighborhoodAction({ neighborhoodId: "hood-1" });

    expect(result).toEqual({ ok: true });
    expect(mockSetPrimaryNeighborhood).toHaveBeenCalledWith({
      userId: "user-2",
      input: { neighborhoodId: "hood-1" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/onboarding");
  });

  it("updates profile image, session, and public profile revalidation", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-5" } as never);
    mockUpdateProfileImage.mockResolvedValue({ id: "user-5", image: "/uploads/avatar.png" } as never);
    mockUnstableUpdate.mockResolvedValue(null);

    const result = await updateProfileImageAction({ imageUrl: "/uploads/avatar.png" });

    expect(result).toEqual({ ok: true });
    expect(mockUpdateProfileImage).toHaveBeenCalledWith({
      userId: "user-5",
      input: { imageUrl: "/uploads/avatar.png" },
    });
    expect(mockUnstableUpdate).toHaveBeenCalledWith({
      user: { image: "/uploads/avatar.png" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/feed");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/search");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/users/user-5");
    expect(mockBumpFeedCacheVersion).toHaveBeenCalled();
    expect(mockBumpSearchCacheVersion).toHaveBeenCalled();
    expect(mockBumpSuggestCacheVersion).toHaveBeenCalled();
    expect(mockBumpPostDetailCacheVersion).toHaveBeenCalled();
    expect(mockBumpPostCommentsCacheVersion).toHaveBeenCalled();
  });

  it("accepts multi-neighborhood payload", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-4" } as never);

    const result = await setPrimaryNeighborhoodAction({
      neighborhoodIds: ["hood-1", "hood-2"],
      primaryNeighborhoodId: "hood-2",
    });

    expect(result).toEqual({ ok: true });
    expect(mockSetPrimaryNeighborhood).toHaveBeenCalledWith({
      userId: "user-4",
      input: {
        neighborhoodIds: ["hood-1", "hood-2"],
        primaryNeighborhoodId: "hood-2",
      },
    });
  });

  it("returns service errors for onboarding actions", async () => {
    const error = new ServiceError("invalid", "INVALID_INPUT", 400);
    mockRequireCurrentUser.mockResolvedValue({ id: "user-3" } as never);
    mockSetPrimaryNeighborhood.mockRejectedValue(error);

    const result = await setPrimaryNeighborhoodAction({ neighborhoodId: "" });

    expect(result).toEqual({ ok: false, code: "INVALID_INPUT", message: "invalid" });
  });
});
