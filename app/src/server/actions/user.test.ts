import { revalidatePath } from "next/cache";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { setPrimaryNeighborhoodAction, updateProfileAction } from "@/server/actions/user";
import { requireCurrentUser } from "@/server/auth";
import { ServiceError } from "@/server/services/service-error";
import { setPrimaryNeighborhood, updateProfile } from "@/server/services/user.service";

vi.mock("@/server/auth", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/server/services/user.service", () => ({
  updateProfile: vi.fn(),
  setPrimaryNeighborhood: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockUpdateProfile = vi.mocked(updateProfile);
const mockSetPrimaryNeighborhood = vi.mocked(setPrimaryNeighborhood);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("user actions", () => {
  beforeEach(() => {
    mockRequireCurrentUser.mockReset();
    mockUpdateProfile.mockReset();
    mockSetPrimaryNeighborhood.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("updates profile and revalidates", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);

    const result = await updateProfileAction({ nickname: "타운펫" });

    expect(result).toEqual({ ok: true });
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      userId: "user-1",
      input: { nickname: "타운펫" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/onboarding");
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
