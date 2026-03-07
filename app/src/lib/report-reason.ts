import { ReportReason } from "@prisma/client";

export const reportReasonLabels: Record<ReportReason, string> = {
  SPAM: "스팸",
  HARASSMENT: "괴롭힘",
  INAPPROPRIATE: "부적절",
  FAKE: "허위 정보",
  FRAUD: "사기/거래 위험",
  PRIVACY: "개인정보 노출",
  EMERGENCY: "긴급 위험",
  OTHER: "기타",
};

export const reportReasonOptions: ReportReason[] = [
  ReportReason.EMERGENCY,
  ReportReason.PRIVACY,
  ReportReason.FRAUD,
  ReportReason.HARASSMENT,
  ReportReason.FAKE,
  ReportReason.SPAM,
  ReportReason.INAPPROPRIATE,
  ReportReason.OTHER,
];

export function getReportReasonLabel(reason: ReportReason) {
  return reportReasonLabels[reason] ?? reason;
}
