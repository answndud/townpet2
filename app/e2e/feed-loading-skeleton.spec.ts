import { expect, test } from "@playwright/test";

const FEED_SLOWDOWN_MS = 1800;

test.describe("feed loading skeleton", () => {
  test("shows feed skeleton on slow navigation", async ({ page }) => {
    const navigation = page.goto(`/feed?debugDelayMs=${FEED_SLOWDOWN_MS}`, {
      waitUntil: "commit",
    });

    await expect(page.getByTestId("feed-loading-skeleton")).toBeVisible({
      timeout: 8_000,
    });
    await navigation;
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByTestId("feed-post-list")).toBeVisible();
  });
});
