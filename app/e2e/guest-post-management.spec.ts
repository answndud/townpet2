import { expect, test } from "@playwright/test";

import { prisma } from "../src/lib/prisma";

const GUEST_NICKNAME = "비회원E2E";
const GUEST_PASSWORD = "1234";

async function findPostIdByTitle(title: string, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const post = await prisma.post.findFirst({
      where: { title },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (post) {
      return post.id;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Created guest post not found by title: ${title}`);
}

test.describe("guest post management", () => {
  test("guest creates, edits, and deletes post with password", async ({ page }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `[PW] 비회원 글 ${runId}`;
    const updatedContent = `비회원 수정 본문 ${runId}`;

    await page.goto("/posts/new");
    await page.getByLabel("제목").fill(title);
    await page.locator("[contenteditable='true']").first().fill(`비회원 작성 본문 ${runId}`);
    await page.getByLabel("비회원 닉네임").fill(GUEST_NICKNAME);
    await page.getByLabel("글 비밀번호").fill(GUEST_PASSWORD);
    await page.getByRole("button", { name: "등록" }).click();

    await expect(page).toHaveURL(/\/feed/);
    const createdPostId = await findPostIdByTitle(title);

    await page.goto(`/posts/${createdPostId}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByPlaceholder("글 비밀번호").fill(GUEST_PASSWORD);
    await page.getByRole("link", { name: "비회원 수정" }).click();
    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}/edit`));

    await page.getByLabel("내용").fill(updatedContent);
    await page.getByLabel("글 비밀번호").fill(GUEST_PASSWORD);
    await page.getByRole("button", { name: "수정 저장" }).click();

    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}$`));
    await expect(page.getByText(updatedContent)).toBeVisible();

    await page.getByPlaceholder("글 비밀번호").fill(GUEST_PASSWORD);
    page.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await page.getByRole("button", { name: "비회원 삭제" }).click();
    await expect(page).toHaveURL(/\/feed/);

    const deletedPost = await prisma.post.findUnique({
      where: { id: createdPostId },
      select: { status: true },
    });
    expect(deletedPost?.status).toBe("DELETED");
  });
});
