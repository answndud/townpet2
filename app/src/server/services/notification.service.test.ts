import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationEntityType, NotificationType } from "@prisma/client";

import {
  createUserNotification,
  notifyCommentOnPost,
  notifyReactionOnPost,
} from "@/server/services/notification.service";
import { createNotification } from "@/server/queries/notification.queries";

vi.mock("@/server/queries/notification.queries", () => ({
  createNotification: vi.fn(),
}));

const mockCreateNotification = vi.mocked(createNotification);

describe("notification service", () => {
  beforeEach(() => {
    mockCreateNotification.mockReset();
    mockCreateNotification.mockResolvedValue({ id: "n-1" } as never);
  });

  it("skips self notifications", async () => {
    const result = await createUserNotification({
      userId: "user-1",
      actorId: "user-1",
      type: NotificationType.SYSTEM,
      entityType: NotificationEntityType.SYSTEM,
      entityId: "system-1",
      title: "self",
    });

    expect(result).toBeNull();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it("clamps title and body lengths", async () => {
    await createUserNotification({
      userId: "user-2",
      actorId: "actor-1",
      type: NotificationType.SYSTEM,
      entityType: NotificationEntityType.SYSTEM,
      entityId: "system-2",
      title: "a".repeat(180),
      body: "b".repeat(300),
    });

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const args = mockCreateNotification.mock.calls[0][0];
    expect(args.title.length).toBeLessThanOrEqual(123);
    expect(args.body?.length).toBeLessThanOrEqual(223);
  });

  it("creates comment notification payload", async () => {
    await notifyCommentOnPost({
      recipientUserId: "owner-1",
      actorId: "actor-1",
      postId: "post-1",
      commentId: "comment-1",
      postTitle: "강남 산책로 추천",
      commentContent: "정말 도움됐어요",
    });

    const args = mockCreateNotification.mock.calls[0][0];
    expect(args.type).toBe(NotificationType.COMMENT_ON_POST);
    expect(args.entityId).toBe("comment-1");
    expect(args.postId).toBe("post-1");
  });

  it("creates reaction notification payload", async () => {
    await notifyReactionOnPost({
      recipientUserId: "owner-1",
      actorId: "actor-1",
      postId: "post-2",
      postTitle: "우리동네 병원 후기",
    });

    const args = mockCreateNotification.mock.calls[0][0];
    expect(args.type).toBe(NotificationType.REACTION_ON_POST);
    expect(args.entityId).toBe("post-2");
    expect(args.postId).toBe("post-2");
  });
});
