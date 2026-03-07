import { describe, expect, it } from "vitest";

import {
  calculateReporterTrustWeight,
  summarizeReportModeration,
} from "@/lib/report-moderation";

describe("report moderation policy", () => {
  it("gives more trust weight to aged verified reporters with activity", () => {
    const trustedWeight = calculateReporterTrustWeight(
      {
        createdAt: new Date("2025-06-01T00:00:00.000Z"),
        emailVerified: new Date("2025-06-02T00:00:00.000Z"),
        postCount: 8,
        commentCount: 12,
        sanctionCount: 0,
      },
      new Date("2026-03-07T00:00:00.000Z"),
    );
    const lowTrustWeight = calculateReporterTrustWeight(
      {
        createdAt: new Date("2026-03-06T22:00:00.000Z"),
        emailVerified: null,
        postCount: 0,
        commentCount: 0,
        sanctionCount: 1,
      },
      new Date("2026-03-07T00:00:00.000Z"),
    );

    expect(trustedWeight).toBeGreaterThan(lowTrustWeight);
    expect(lowTrustWeight).toBeGreaterThanOrEqual(0.35);
  });

  it("marks high-trust multi-reporter bursts as auto-hide candidates", () => {
    const summary = summarizeReportModeration([
      {
        reporterId: "user-1",
        createdAt: new Date("2026-03-07T00:00:00.000Z"),
        reason: "SPAM",
        reporterTrustWeight: 1.35,
      },
      {
        reporterId: "user-2",
        createdAt: new Date("2026-03-07T00:04:00.000Z"),
        reason: "FAKE",
        reporterTrustWeight: 1.25,
      },
      {
        reporterId: "user-3",
        createdAt: new Date("2026-03-07T00:07:00.000Z"),
        reason: "SPAM",
        reporterTrustWeight: 1.2,
      },
    ]);

    expect(summary.shouldAutoHide).toBe(true);
    expect(summary.priority).toBe("CRITICAL");
    expect(summary.signalLabels).toContain("자동 숨김 후보");
  });

  it("keeps low-trust bursts visible but escalates queue priority", () => {
    const summary = summarizeReportModeration([
      {
        reporterId: "user-1",
        createdAt: new Date("2026-03-07T00:00:00.000Z"),
        reason: "SPAM",
        reporterTrustWeight: 0.45,
      },
      {
        reporterId: "user-2",
        createdAt: new Date("2026-03-07T00:02:00.000Z"),
        reason: "SPAM",
        reporterTrustWeight: 0.5,
      },
      {
        reporterId: "user-3",
        createdAt: new Date("2026-03-07T00:05:00.000Z"),
        reason: "OTHER",
        reporterTrustWeight: 0.45,
      },
    ]);

    expect(summary.shouldAutoHide).toBe(false);
    expect(summary.priority).toBe("HIGH");
    expect(summary.signalLabels).toContain("저신뢰 계정 집중");
  });

  it("forces emergency reports into the critical queue", () => {
    const summary = summarizeReportModeration([
      {
        reporterId: "user-1",
        createdAt: new Date("2026-03-07T00:00:00.000Z"),
        reason: "EMERGENCY",
        reporterTrustWeight: 0.45,
      },
    ]);

    expect(summary.priority).toBe("CRITICAL");
    expect(summary.shouldAutoHide).toBe(false);
    expect(summary.signalLabels).toContain("긴급 신고");
  });

  it("elevates privacy and fraud reports even before auto-hide", () => {
    const summary = summarizeReportModeration([
      {
        reporterId: "user-1",
        createdAt: new Date("2026-03-07T00:00:00.000Z"),
        reason: "PRIVACY",
        reporterTrustWeight: 0.45,
      },
      {
        reporterId: "user-2",
        createdAt: new Date("2026-03-07T00:06:00.000Z"),
        reason: "FRAUD",
        reporterTrustWeight: 0.5,
      },
    ]);

    expect(summary.priority).toBe("HIGH");
    expect(summary.signalLabels).toContain("개인정보 노출");
    expect(summary.signalLabels).toContain("사기/거래 위험");
  });
});
