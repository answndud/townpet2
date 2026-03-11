import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { UserRelationControls } from "@/components/user/user-relation-controls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/server/actions/user-relation", () => ({
  muteUserAction: vi.fn(),
  unmuteUserAction: vi.fn(),
}));

describe("UserRelationControls", () => {
  it("renders only mute controls for the target user", () => {
    const html = renderToStaticMarkup(
      <UserRelationControls
        targetUserId="user-1"
        initialState={{
          isBlockedByMe: false,
          hasBlockedMe: false,
          isMutedByMe: false,
        }}
      />,
    );

    expect(html).toContain("뮤트");
    expect(html).not.toContain(">차단<");
    expect(html).not.toContain("차단 해제");
  });

  it("keeps the blocked-by-other notice without exposing a block action", () => {
    const html = renderToStaticMarkup(
      <UserRelationControls
        targetUserId="user-2"
        initialState={{
          isBlockedByMe: false,
          hasBlockedMe: true,
          isMutedByMe: true,
        }}
      />,
    );

    expect(html).toContain("상대가 나를 차단한 상태입니다.");
    expect(html).toContain("뮤트 해제");
    expect(html).not.toContain("차단 해제");
  });
});
