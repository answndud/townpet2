import "dotenv/config";
import { PostScope, PostType, UserRole } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  getNewUserSafetyPolicy,
  setNewUserSafetyPolicy,
} from "../src/server/queries/policy.queries";
import { createComment } from "../src/server/services/comment.service";
import { createPost } from "../src/server/services/post.service";
import { ServiceError } from "../src/server/services/service-error";

async function main() {
  const runId = `e2e-policy-${Date.now()}`;
  const newUserEmail = `${runId}-new@townpet.dev`;
  const oldUserEmail = `${runId}-old@townpet.dev`;

  const originalPolicy = await getNewUserSafetyPolicy();
  const newPolicy = {
    minAccountAgeHours: 72,
    restrictedPostTypes: [PostType.FREE_POST],
    contactBlockWindowHours: 48,
  };

  const setResult = await setNewUserSafetyPolicy(newPolicy);
  if (!setResult.ok) {
    throw new Error("Failed to update new user safety policy. Schema sync required.");
  }

  let newUserId: string | null = null;
  let oldUserId: string | null = null;
  let oldUserPostId: string | null = null;
  let oldUserCommentId: string | null = null;

  try {
    const now = new Date();
    const [newUser, oldUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: newUserEmail,
          role: UserRole.USER,
          createdAt: now,
          updatedAt: now,
        },
        select: { id: true, email: true },
      }),
      prisma.user.create({
        data: {
          email: oldUserEmail,
          role: UserRole.USER,
          createdAt: new Date(now.getTime() - 96 * 60 * 60 * 1000),
          updatedAt: now,
        },
        select: { id: true, email: true },
      }),
    ]);

    newUserId = newUser.id;
    oldUserId = oldUser.id;

    let newUserBlocked = false;
    try {
      await createPost({
        authorId: newUser.id,
        input: {
          title: `[E2E] restricted type ${runId}`,
          content: "new user restricted test",
          type: PostType.FREE_POST,
          scope: PostScope.GLOBAL,
          imageUrls: [],
        },
      });
    } catch (error) {
      if (
        error instanceof ServiceError &&
        error.code === "NEW_USER_RESTRICTED_TYPE"
      ) {
        newUserBlocked = true;
      } else {
        throw error;
      }
    }

    if (!newUserBlocked) {
      throw new Error("Expected NEW_USER_RESTRICTED_TYPE for new user.");
    }

    const oldUserPost = await createPost({
      authorId: oldUser.id,
      input: {
        title: `[E2E] old user post ${runId}`,
        content: "old user should be allowed",
        type: PostType.FREE_POST,
        scope: PostScope.GLOBAL,
        imageUrls: [],
      },
    });
    oldUserPostId = oldUserPost.id;

    let contactBlocked = false;
    try {
      await createComment({
        authorId: newUser.id,
        postId: oldUserPost.id,
        input: {
          content: "문의 010-1234-5678",
        },
      });
    } catch (error) {
      if (
        error instanceof ServiceError &&
        error.code === "CONTACT_RESTRICTED_FOR_NEW_USER"
      ) {
        contactBlocked = true;
      } else {
        throw error;
      }
    }

    if (!contactBlocked) {
      throw new Error("Expected CONTACT_RESTRICTED_FOR_NEW_USER for new user.");
    }

    const oldUserComment = await createComment({
      authorId: oldUser.id,
      postId: oldUserPost.id,
      input: {
        content: "연락처 010-1234-5678",
      },
    });
    oldUserCommentId = oldUserComment.id;

    if (oldUserComment.content.includes("010-1234-5678")) {
      throw new Error("Expected old user contact to be masked.");
    }

    console.log(
      `E2E policy flow succeeded: newUser=${newUser.email}, oldUser=${oldUser.email}, post=${oldUserPost.id}, comment=${oldUserComment.id}`,
    );
  } finally {
    const restoreResult = await setNewUserSafetyPolicy(originalPolicy);
    if (!restoreResult.ok) {
      console.warn("Failed to restore original new-user safety policy.");
    }

    await prisma.$transaction(async (tx) => {
      if (oldUserCommentId) {
        await tx.notification.deleteMany({
          where: { commentId: oldUserCommentId },
        });
        await tx.comment.deleteMany({
          where: { id: oldUserCommentId },
        });
      }
      if (oldUserPostId) {
        await tx.notification.deleteMany({
          where: { postId: oldUserPostId },
        });
        await tx.comment.deleteMany({
          where: { postId: oldUserPostId },
        });
        await tx.post.deleteMany({
          where: { id: oldUserPostId },
        });
      }
      if (newUserId) {
        await tx.user.deleteMany({ where: { id: newUserId } });
      }
      if (oldUserId) {
        await tx.user.deleteMany({ where: { id: oldUserId } });
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
