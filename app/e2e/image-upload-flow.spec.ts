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

  test("uploads image, verifies on detail, and deletes created post", async ({
    page,
  }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `[PW] 이미지 업로드 ${runId}`;
    const content = `이미지 업로드 E2E 검증 본문 ${runId}`;

    await loginAndOpenPostCreate(page);

    await page.getByLabel("제목").fill(title);
    await page.getByLabel("내용").fill(content);
    await page.getByTestId("image-upload-input").setInputFiles({
      name: `upload-${runId}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(SAMPLE_PNG_BASE64, "base64"),
    });

    await expect(page.getByTestId("image-upload-preview-item")).toHaveCount(1);
    await page.getByRole("button", { name: "게시하기" }).click();

    await expect(page).toHaveURL(/\/feed/);
    const createdPostId = await findPostIdByTitle(title);
    await page.goto(`/posts/${createdPostId}`);
    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}$`));
    await expect(page.getByRole("heading", { name: "첨부 이미지" })).toBeVisible();
    await expect(page.locator('a[href^="/uploads/"]').first()).toBeVisible();

    page.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await page.getByRole("button", { name: "삭제" }).click();

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
