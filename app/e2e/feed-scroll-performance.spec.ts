import { PostScope, PostStatus, PostType } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { prisma } from "../src/lib/prisma";

const PERF_AUTHOR_EMAIL = "perf.scroll@townpet.dev";
const PERF_TITLE_PREFIX = "[PERF] feed-scroll";
const PERF_POST_COUNT = 140;
const TARGET_MIN_ITEMS = 100;
const FRAME_P95_PASS_THRESHOLD_MS = 42;
const JANK_PASS_THRESHOLD_RATIO = 0.08;

let perfAuthorId: string | null = null;

type FrameMetrics = {
  sampleCount: number;
  averageFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  jankOver50Count: number;
  longFrameOver100Count: number;
  jankRatio: number;
  heapUsedMb: number | null;
};

function round(value: number, digits = 2) {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}

async function seedPerformancePosts() {
  const user = await prisma.user.upsert({
    where: { email: PERF_AUTHOR_EMAIL },
    update: {
      name: "Feed Perf Runner",
      nickname: "feed-perf-runner",
      emailVerified: new Date(),
    },
    create: {
      email: PERF_AUTHOR_EMAIL,
      name: "Feed Perf Runner",
      nickname: "feed-perf-runner",
      emailVerified: new Date(),
    },
    select: { id: true },
  });
  perfAuthorId = user.id;

  await prisma.post.deleteMany({
    where: {
      authorId: user.id,
      title: {
        startsWith: PERF_TITLE_PREFIX,
      },
    },
  });

  const now = Date.now();
  await prisma.post.createMany({
    data: Array.from({ length: PERF_POST_COUNT }).map((_, index) => {
      const time = new Date(now - index * 45_000);
      return {
        authorId: user.id,
        type: PostType.FREE_POST,
        scope: PostScope.GLOBAL,
        status: PostStatus.ACTIVE,
        title: `${PERF_TITLE_PREFIX} ${String(index + 1).padStart(3, "0")}`,
        content: `무한 스크롤 성능 점검용 샘플 게시글 #${index + 1}. 연속 로딩과 렌더링 성능을 체크합니다.`,
        createdAt: time,
        updatedAt: time,
      };
    }),
  });
}

async function cleanupPerformancePosts() {
  if (!perfAuthorId) {
    return;
  }

  await prisma.post.deleteMany({
    where: {
      authorId: perfAuthorId,
      title: {
        startsWith: PERF_TITLE_PREFIX,
      },
    },
  });
}

test.describe("feed infinite scroll performance", () => {
  test.beforeAll(async () => {
    await seedPerformancePosts();
  });

  test.afterAll(async () => {
    await cleanupPerformancePosts();
  });

  test("loads 100+ posts and records scroll rendering metrics", async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      const samples: number[] = [];
      let lastTime = performance.now();
      let rafId = 0;
      const tick = (now: number) => {
        samples.push(now - lastTime);
        lastTime = now;
        rafId = window.requestAnimationFrame(tick);
      };
      rafId = window.requestAnimationFrame(tick);

      (
        window as Window & {
          __feedPerfTracker?: {
            stop: () => void;
            samples: number[];
          };
        }
      ).__feedPerfTracker = {
        stop: () => {
          window.cancelAnimationFrame(rafId);
        },
        samples,
      };
    });

    await page.goto("/feed?scope=GLOBAL&mode=ALL&sort=LATEST");
    await expect(page.getByTestId("feed-post-list")).toBeVisible();
    await expect(page.getByTestId("feed-post-item").first()).toBeVisible();

    const itemLocator = page.getByTestId("feed-post-item");
    let previousCount = await itemLocator.count();
    let stableRounds = 0;

    for (let step = 0; step < 40; step += 1) {
      await page.evaluate(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "auto",
        });
      });
      await page.waitForTimeout(260);

      const loadButton = page.getByRole("button", { name: "게시글 더 보기" });
      if (await loadButton.isVisible()) {
        await loadButton.click();
        await page.waitForTimeout(180);
      }

      const currentCount = await itemLocator.count();
      if (currentCount === previousCount) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
        previousCount = currentCount;
      }

      if (currentCount >= TARGET_MIN_ITEMS && stableRounds >= 2) {
        break;
      }
    }

    const totalItems = await itemLocator.count();
    const frameMetrics = await page.evaluate<FrameMetrics>(() => {
      const tracker = (
        window as Window & {
          __feedPerfTracker?: {
            stop: () => void;
            samples: number[];
          };
        }
      ).__feedPerfTracker;
      tracker?.stop();

      const raw = Array.isArray(tracker?.samples) ? tracker.samples : [];
      const normalized = raw.filter(
        (value): value is number =>
          typeof value === "number" &&
          Number.isFinite(value) &&
          value > 0 &&
          value < 200,
      );
      const sorted = [...normalized].sort((a, b) => a - b);
      const sampleCount = normalized.length;
      const averageFrameMs =
        sampleCount > 0
          ? normalized.reduce((acc, value) => acc + value, 0) / sampleCount
          : 0;
      const p95FrameMs =
        sorted.length > 0
          ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
          : 0;
      const p99FrameMs =
        sorted.length > 0
          ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.99) - 1)]
          : 0;
      const jankOver50Count = normalized.filter((value) => value > 50).length;
      const longFrameOver100Count = normalized.filter((value) => value > 100).length;
      const jankRatio = sampleCount > 0 ? jankOver50Count / sampleCount : 0;
      const memory = (
        performance as Performance & {
          memory?: {
            usedJSHeapSize?: number;
          };
        }
      ).memory;
      const heapUsedMb =
        typeof memory?.usedJSHeapSize === "number"
          ? memory.usedJSHeapSize / (1024 * 1024)
          : null;

      return {
        sampleCount,
        averageFrameMs,
        p95FrameMs,
        p99FrameMs,
        jankOver50Count,
        longFrameOver100Count,
        jankRatio,
        heapUsedMb,
      };
    });

    const status =
      totalItems < TARGET_MIN_ITEMS
        ? "FAIL"
        : frameMetrics.p95FrameMs <= FRAME_P95_PASS_THRESHOLD_MS &&
            frameMetrics.jankRatio <= JANK_PASS_THRESHOLD_RATIO
          ? "PASS"
          : "WARN";

    const bottlenecks: string[] = [];
    if (totalItems < TARGET_MIN_ITEMS) {
      bottlenecks.push(
        `목표 아이템(${TARGET_MIN_ITEMS}) 미만으로 로드됨: ${totalItems}개`,
      );
    }
    if (frameMetrics.p95FrameMs > FRAME_P95_PASS_THRESHOLD_MS) {
      bottlenecks.push(
        `프레임 p95가 임계(${FRAME_P95_PASS_THRESHOLD_MS}ms) 초과: ${round(frameMetrics.p95FrameMs)}ms`,
      );
    }
    if (frameMetrics.jankRatio > JANK_PASS_THRESHOLD_RATIO) {
      bottlenecks.push(
        `Jank 비율이 임계(${round(JANK_PASS_THRESHOLD_RATIO * 100)}%) 초과: ${round(
          frameMetrics.jankRatio * 100,
        )}%`,
      );
    }
    if (frameMetrics.longFrameOver100Count > 0) {
      bottlenecks.push(
        `100ms 초과 long frame ${frameMetrics.longFrameOver100Count}회 발생`,
      );
    }

    const report = [
      "# Feed Scroll Performance Report",
      "",
      `- 생성 시각: ${new Date().toISOString()}`,
      `- 실행 환경: Playwright Chromium (headless), /feed?scope=GLOBAL&mode=ALL&sort=LATEST`,
      `- 시드 데이터: ${PERF_POST_COUNT}개 (${PERF_TITLE_PREFIX})`,
      `- 판정: ${status}`,
      "",
      "## 측정 결과",
      `- 로드된 게시글 수: ${totalItems}`,
      `- 프레임 샘플 수: ${frameMetrics.sampleCount}`,
      `- 평균 프레임 간격: ${round(frameMetrics.averageFrameMs)}ms`,
      `- p95 프레임 간격: ${round(frameMetrics.p95FrameMs)}ms`,
      `- p99 프레임 간격: ${round(frameMetrics.p99FrameMs)}ms`,
      `- 50ms 초과 프레임: ${frameMetrics.jankOver50Count}회 (${round(frameMetrics.jankRatio * 100)}%)`,
      `- 100ms 초과 프레임: ${frameMetrics.longFrameOver100Count}회`,
      `- JS Heap 사용량(종료 시점): ${
        frameMetrics.heapUsedMb === null ? "N/A" : `${round(frameMetrics.heapUsedMb)}MB`
      }`,
      "",
      "## 기준값",
      `- 목표 로드 게시글: >= ${TARGET_MIN_ITEMS}`,
      `- p95 프레임 간격 PASS 기준: <= ${FRAME_P95_PASS_THRESHOLD_MS}ms`,
      `- Jank 비율 PASS 기준: <= ${round(JANK_PASS_THRESHOLD_RATIO * 100)}%`,
      "",
      "## 병목/메모",
      ...(bottlenecks.length > 0 ? bottlenecks.map((item) => `- ${item}`) : ["- 특이 병목 없음"]),
      "",
    ].join("\n");

    const reportPath = resolve(
      process.cwd(),
      "../docs/plan/feed-scroll-performance-report.md",
    );
    await writeFile(reportPath, report, "utf8");

    await testInfo.attach("feed-scroll-metrics", {
      contentType: "application/json",
      body: Buffer.from(
        JSON.stringify(
          {
            status,
            totalItems,
            frameMetrics: {
              sampleCount: frameMetrics.sampleCount,
              averageFrameMs: round(frameMetrics.averageFrameMs),
              p95FrameMs: round(frameMetrics.p95FrameMs),
              p99FrameMs: round(frameMetrics.p99FrameMs),
              jankOver50Count: frameMetrics.jankOver50Count,
              longFrameOver100Count: frameMetrics.longFrameOver100Count,
              jankRatio: round(frameMetrics.jankRatio, 4),
              heapUsedMb:
                frameMetrics.heapUsedMb === null ? null : round(frameMetrics.heapUsedMb),
            },
          },
          null,
          2,
        ),
      ),
    });

    expect(totalItems).toBeGreaterThanOrEqual(TARGET_MIN_ITEMS);
  });
});
