import "dotenv/config";
import { NotificationType, PostScope, PostType } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { listNotificationsByUser, markNotificationRead } from "../src/server/queries/notification.queries";
import { createComment } from "../src/server/services/comment.service";
import { createPost } from "../src/server/services/post.service";

const recipientEmail = process.env.E2E_RECIPIENT_EMAIL ?? "power.reviewer@townpet.dev";
const actorEmail = process.env.E2E_ACTOR_EMAIL ?? "mod.trust@townpet.dev";

async function main() {
  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail },
    select: { id: true, email: true },
  });
  const actor = await prisma.user.findUnique({
    where: { email: actorEmail },
    select: { id: true, email: true },
  });

  if (!recipient) {
    throw new Error(`Recipient user not found: ${recipientEmail}`);
  }
  if (!actor) {
    throw new Error(`Actor user not found: ${actorEmail}`);
  }
  if (recipient.id === actor.id) {
    throw new Error("Recipient and actor users must be different.");
  }

  const runId = `e2e-${Date.now()}`;
  const postTitle = `[E2E] notification flow ${runId}`;

  const post = await createPost({
    authorId: recipient.id,
    input: {
      title: postTitle,
      content: "E2E notification flow content",
      type: PostType.FREE_POST,
      scope: PostScope.GLOBAL,
      imageUrls: [],
    },
  });

  const comment = await createComment({
    authorId: actor.id,
    postId: post.id,
    input: {
      content: `E2E comment ${runId}`,
    },
  });

  const notifications = await listNotificationsByUser({
    userId: recipient.id,
    limit: 20,
  });

  const target = notifications.items.find(
    (item) =>
      item.type === NotificationType.COMMENT_ON_POST &&
      item.postId === post.id &&
      item.commentId === comment.id,
  );

  if (!target) {
    throw new Error("Notification was not generated for new comment.");
  }

  if (target.isRead) {
    throw new Error("Generated notification must be unread initially.");
  }

  const changed = await markNotificationRead(recipient.id, target.id);
  if (!changed) {
    throw new Error("Failed to mark notification as read.");
  }

  const verified = await prisma.notification.findUnique({
    where: { id: target.id },
    select: { id: true, isRead: true, readAt: true },
  });

  if (!verified?.isRead || !verified.readAt) {
    throw new Error("Notification read state was not persisted.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        OR: [{ id: target.id }, { commentId: comment.id }, { postId: post.id }],
      },
    });
    await tx.comment.deleteMany({ where: { id: comment.id } });
    await tx.post.delete({ where: { id: post.id } });
  });

  console.log(
    `E2E flow succeeded: recipient=${recipient.email}, actor=${actor.email}, post=${post.id}, comment=${comment.id}, notification=${target.id}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
