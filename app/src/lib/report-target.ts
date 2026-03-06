import { ReportTarget } from "@prisma/client";

export const SUPPORTED_REPORT_TARGETS = [ReportTarget.POST] as const;

export type SupportedReportTarget = (typeof SUPPORTED_REPORT_TARGETS)[number];

const reportTargetLabels: Record<SupportedReportTarget, string> = {
  POST: "게시글",
};

export function isSupportedReportTarget(
  value: ReportTarget | string | null | undefined,
): value is SupportedReportTarget {
  return value === ReportTarget.POST;
}

export function getReportTargetLabel(value: ReportTarget | string) {
  if (isSupportedReportTarget(value)) {
    return reportTargetLabels[value];
  }

  return "미지원";
}
