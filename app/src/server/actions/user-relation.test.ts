import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/server/auth";
import {
  muteUserAction,
  unmuteUserAction,
} from "@/server/actions/user-relation";
import {
  muteUser,
  unmuteUser,
} from "@/server/services/user-relation.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/server/services/user-relation.service", () => ({
  muteUser: vi.fn(),
  unmuteUser: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockMuteUser = vi.mocked(muteUser);
const mockUnmuteUser = vi.mocked(unmuteUser);

describe("user relation actions", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
    mockRequireCurrentUser.mockReset();
    mockMuteUser.mockReset();
    mockUnmuteUser.mockReset();
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
  });

  it("revalidates relation views by default after muting", async () => {
    mockMuteUser.mockResolvedValue({
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: true,
    } as never);

    const result = await muteUserAction({ targetUserId: "cmm9yirhq000014tg6vxm9sih" });

    expect(result).toEqual({
      ok: true,
      state: {
        isBlockedByMe: false,
        hasBlockedMe: false,
        isMutedByMe: true,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledTimes(4);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/feed");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/search");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/profile");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/posts/[id]", "page");
  });

  it("skips revalidation when relation action opts out for local comment refresh", async () => {
    mockUnmuteUser.mockResolvedValue({
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    } as never);

    const result = await unmuteUserAction(
      { targetUserId: "cmm9yirhq000014tg6vxm9sih" },
      { revalidate: false },
    );

    expect(result).toEqual({
      ok: true,
      state: {
        isBlockedByMe: false,
        hasBlockedMe: false,
        isMutedByMe: false,
      },
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("maps service errors without revalidating", async () => {
    mockMuteUser.mockRejectedValue(new ServiceError("bad request", "INVALID_INPUT", 400));

    const result = await muteUserAction({ targetUserId: "cmm9yirhq000014tg6vxm9sih" });

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      message: "bad request",
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
