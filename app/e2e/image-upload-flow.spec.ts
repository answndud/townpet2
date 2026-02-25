import { expect, test, type Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/server/password";

const TEST_EMAIL = process.env.E2E_LOGIN_EMAIL ?? "e2e.upload@townpet.dev";
const TEST_PASSWORD =
  process.env.E2E_LOGIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? "dev-password-1234";

const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5n6gAAAABJRU5ErkJggg==";

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
  throw new Error(`Created post not found by title: ${title}`);
}

async function loginAndOpenPostCreate(page: Page) {
  await page.goto("/login?next=%2Fposts%2Fnew");
  await page.getByTestId("login-email").fill(TEST_EMAIL);
  await page.getByTestId("login-password").fill(TEST_PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/posts\/new/, { timeout: 15_000 });
}

test.describe("image upload flow", () => {
  test.beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);

    const neighborhood = await prisma.neighborhood.upsert({
      where: {
        name_city_district: {
          name: "서초동",
          city: "서울",
          district: "서초구",
        },
      },
      update: {},
      create: {
        name: "서초동",
        city: "서울",
        district: "서초구",
      },
      select: { id: true },
    });

    const user = await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: {
        emailVerified: new Date(),
        passwordHash,
        nickname: "e2e-upload",
        name: "E2E Upload",
      },
      create: {
        email: TEST_EMAIL,
        emailVerified: new Date(),
        passwordHash,
        nickname: "e2e-upload",
        name: "E2E Upload",
      },
      select: { id: true },
    });

    await prisma.userNeighborhood.upsert({
      where: {
        userId_neighborhoodId: {
          userId: user.id,
          neighborhoodId: neighborhood.id,
        },
      },
      update: { isPrimary: true },
      create: {
        userId: user.id,
        neighborhoodId: neighborhood.id,
        isPrimary: true,
      },
    });
  });

  test("syncs attachments between create-edit-detail", async ({
    page,
  }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `[PW] 이미지 업로드 ${runId}`;
    const content = `이미지 업로드 E2E 검증 본문 ${runId}`;
    const fileA = `upload-a-${runId}.png`;
    const fileB = `upload-b-${runId}.png`;

    await loginAndOpenPostCreate(page);

    await page.getByLabel("제목").fill(title);
    await page.locator('[contenteditable="true"]').first().fill(content);
    await page.getByTestId("image-upload-input").setInputFiles({
      name: fileA,
      mimeType: "image/png",
      buffer: Buffer.from(SAMPLE_PNG_BASE64, "base64"),
    });
    await page.getByTestId("image-upload-input").setInputFiles({
      name: fileB,
      mimeType: "image/png",
      buffer: Buffer.from(SAMPLE_PNG_BASE64, "base64"),
    });

    await expect(page.getByTestId("image-upload-preview-item")).toHaveCount(2);
    await page.getByRole("button", { name: "등록" }).click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 15_000 });
    const createdPostId = await findPostIdByTitle(title);
    await page.goto(`/posts/${createdPostId}`);
    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}$`));
    await expect(page.getByText("첨부파일")).toBeVisible();
    const attachmentLinks = page
      .locator("p")
      .filter({ hasText: "첨부파일" })
      .locator("xpath=..")
      .locator("a");
    await expect(attachmentLinks).toHaveCount(2);

    await page.getByRole("link", { name: "수정" }).click();
    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}/edit$`));
    await expect(page.getByTestId("image-upload-preview-item")).toHaveCount(2);
    await page
      .getByTestId("image-upload-preview-item")
      .nth(0)
      .getByRole("button", { name: "삭제" })
      .click();
    await expect(page.getByTestId("image-upload-preview-item")).toHaveCount(1);
    await page.getByRole("button", { name: "수정 저장" }).click();

    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}$`));
    await expect(attachmentLinks).toHaveCount(1);

    page.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await page.getByRole("button", { name: "삭제" }).click();

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
