import { ReportReason } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;
const BURST_WINDOW_MS = 10 * 60 * 1000;
const MIN_TRUST_WEIGHT = 0.35;
const MAX_TRUST_WEIGHT = 1.6;
const HIGH_PRIORITY_SCORE_THRESHOLD = 2.15;
export const REPORT_AUTO_HIDE_SCORE_THRESHOLD = 3;

export type ReportQueuePriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type ReporterTrustInput = {
  createdAt: Date;
  emailVerified: Date | null;
  postCount: number;
  commentCount: number;
  sanctionCount: number;
};

export type ReportModerationSignal = {
  reporterId: string;
  createdAt: Date;
  reason: ReportReason;
  reporterTrustWeight: number;
};

export type ReportModerationSummary = {
  priority: ReportQueuePriority;
  shouldAutoHide: boolean;
  weightedScore: number;
  burstWeightedScore: number;
  uniqueReporterCount: number;
  totalReportCount: number;
  burstReportCount: number;
  burstUniqueReporterCount: number;
  signalLabels: string[];
};

const reasonSeverityWeight: Record<ReportReason, number> = {
  SPAM: 0.1,
  HARASSMENT: 0.25,
  INAPPROPRIATE: 0.15,
  FAKE: 0.25,
  FRAUD: 0.55,
  PRIVACY: 0.85,
  EMERGENCY: 1.4,
  OTHER: 0,
};

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getWeightedReportScore(signal: ReportModerationSignal) {
  return signal.reporterTrustWeight + (reasonSeverityWeight[signal.reason] ?? 0);
}

export function calculateReporterTrustWeight(
  input: ReporterTrustInput,
  now = new Date(),
) {
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - input.createdAt.getTime()) / DAY_MS),
  );
  const activityCount = input.postCount + input.commentCount;

  let score = 1;

  if (ageDays < 1) {
    score -= 0.55;
  } else if (ageDays < 7) {
    score -= 0.35;
  } else if (ageDays < 30) {
    score -= 0.15;
  } else if (ageDays >= 180) {
    score += 0.45;
  } else if (ageDays >= 90) {
    score += 0.35;
  } else if (ageDays >= 30) {
    score += 0.2;
  }

  if (input.emailVerified) {
    score += 0.15;
  }

  if (activityCount === 0) {
    score -= 0.15;
  } else if (activityCount >= 20) {
    score += 0.25;
  } else if (activityCount >= 5) {
    score += 0.15;
  }

  if (input.sanctionCount > 0) {
    score -= 0.35;
  }

  return roundScore(clamp(score, MIN_TRUST_WEIGHT, MAX_TRUST_WEIGHT));
}

export function summarizeReportModeration(
  reports: ReportModerationSignal[],
): ReportModerationSummary {
  if (reports.length === 0) {
    return {
      priority: "LOW",
      shouldAutoHide: false,
      weightedScore: 0,
      burstWeightedScore: 0,
      uniqueReporterCount: 0,
      totalReportCount: 0,
      burstReportCount: 0,
      burstUniqueReporterCount: 0,
      signalLabels: ["신고 없음"],
    };
  }

  const sortedByCreatedAt = [...reports].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const newestReport = sortedByCreatedAt.at(-1) ?? sortedByCreatedAt[0];
  const burstStartAt = newestReport.createdAt.getTime() - BURST_WINDOW_MS;
  const burstReports = sortedByCreatedAt.filter(
    (report) => report.createdAt.getTime() >= burstStartAt,
  );

  const weightedScore = roundScore(
    reports.reduce((sum, report) => sum + getWeightedReportScore(report), 0),
  );
  const burstWeightedScore = roundScore(
    burstReports.reduce((sum, report) => sum + getWeightedReportScore(report), 0),
  );
  const uniqueReporterCount = new Set(reports.map((report) => report.reporterId)).size;
  const burstUniqueReporterCount = new Set(
    burstReports.map((report) => report.reporterId),
  ).size;
  const lowTrustCount = reports.filter((report) => report.reporterTrustWeight < 0.8).length;
  const hasFraud = reports.some((report) => report.reason === ReportReason.FRAUD);
  const hasPrivacy = reports.some((report) => report.reason === ReportReason.PRIVACY);
  const hasEmergency = reports.some((report) => report.reason === ReportReason.EMERGENCY);

  const shouldAutoHide =
    uniqueReporterCount >= 2 && weightedScore >= REPORT_AUTO_HIDE_SCORE_THRESHOLD;

  let priority: ReportQueuePriority = "LOW";
  if (hasEmergency || shouldAutoHide) {
    priority = "CRITICAL";
  } else if (
    hasPrivacy ||
    hasFraud ||
    weightedScore >= HIGH_PRIORITY_SCORE_THRESHOLD ||
    burstUniqueReporterCount >= 3 ||
    (burstUniqueReporterCount >= 2 && burstWeightedScore >= 1.8)
  ) {
    priority = "HIGH";
  } else if (weightedScore >= 1.15 || uniqueReporterCount >= 2) {
    priority = "NORMAL";
  }

  const signalLabels = [`가중치 ${weightedScore.toFixed(2)}`];
  if (hasEmergency) {
    signalLabels.push("긴급 신고");
  }
  if (hasPrivacy) {
    signalLabels.push("개인정보 노출");
  }
  if (hasFraud) {
    signalLabels.push("사기/거래 위험");
  }
  if (burstUniqueReporterCount >= 2) {
    signalLabels.push(`10분 내 ${burstUniqueReporterCount}명 신고`);
  }
  if (uniqueReporterCount >= 3) {
    signalLabels.push(`고유 신고자 ${uniqueReporterCount}명`);
  }
  if (lowTrustCount >= 2) {
    signalLabels.push("저신뢰 계정 집중");
  }
  if (shouldAutoHide) {
    signalLabels.push("자동 숨김 후보");
  }

  return {
    priority,
    shouldAutoHide,
    weightedScore,
    burstWeightedScore,
    uniqueReporterCount,
    totalReportCount: reports.length,
    burstReportCount: burstReports.length,
    burstUniqueReporterCount,
    signalLabels,
  };
}

export function getReportQueuePriorityLabel(priority: ReportQueuePriority) {
  switch (priority) {
    case "CRITICAL":
      return "긴급";
    case "HIGH":
      return "높음";
    case "NORMAL":
      return "보통";
    case "LOW":
    default:
      return "낮음";
  }
}

export function getReportQueuePriorityOrder(priority: ReportQueuePriority) {
  switch (priority) {
    case "CRITICAL":
      return 3;
    case "HIGH":
      return 2;
    case "NORMAL":
      return 1;
    case "LOW":
    default:
      return 0;
  }
}
