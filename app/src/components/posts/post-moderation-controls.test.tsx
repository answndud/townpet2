import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostStatus } from "@prisma/client";

import {
  parsePostModerationResponsePayload,
  PostModerationControls,
} from "@/components/posts/post-moderation-controls";

describe("PostModerationControls", () => {
  it("renders a hide action surface for active posts", () => {
    const html = renderToStaticMarkup(
      <PostModerationControls
        postId="post-1"
        postTitle="테스트 글"
        currentStatus={PostStatus.ACTIVE}
        onStatusChange={() => undefined}
      />,
    );

    expect(html).toContain("게시글 직접 숨김/해제");
    expect(html).toContain("현재 상태: 공개");
    expect(html).toContain("게시글 숨김");
  });

  it("returns an error payload message when the moderation API fails", async () => {
    const response = new Response(
      JSON.stringify({
        ok: false,
        error: { message: "숨김 처리에 실패했습니다." },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );

    const payload = await parsePostModerationResponsePayload<{ ok: true }>(response);
    expect(payload).toEqual({
      ok: false,
      message: "숨김 처리에 실패했습니다.",
    });
  });
});
