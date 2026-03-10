import { describe, expect, it, vi } from "vitest";

import { copyPostShareUrl } from "@/lib/post-share";

describe("copyPostShareUrl", () => {
  it("returns a success message when clipboard write succeeds", async () => {
    const clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      copyPostShareUrl(clipboard, "https://townpet.vercel.app/posts/post-1"),
    ).resolves.toEqual({
      ok: true,
      message: "링크를 복사했습니다.",
    });
    expect(clipboard.writeText).toHaveBeenCalledWith("https://townpet.vercel.app/posts/post-1");
  });

  it("returns a failure message when clipboard is unavailable", async () => {
    await expect(
      copyPostShareUrl(undefined, "https://townpet.vercel.app/posts/post-1"),
    ).resolves.toEqual({
      ok: false,
      message: "링크 복사에 실패했습니다.",
    });
  });

  it("returns a failure message when clipboard write rejects", async () => {
    const clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    };

    await expect(
      copyPostShareUrl(clipboard, "https://townpet.vercel.app/posts/post-1"),
    ).resolves.toEqual({
      ok: false,
      message: "링크 복사에 실패했습니다.",
    });
  });
});
