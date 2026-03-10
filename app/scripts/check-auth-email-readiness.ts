import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  assessAuthEmailReadiness,
  type AuthEmailNormalizationDrift,
  type AuthEmailReadinessReport,
  type AuthEmailReadinessStatus,
  type InvalidAuthEmailRecord,
} from "../src/server/auth-email-readiness";

const SAMPLE_LIMIT = Number(process.env.AUTH_EMAIL_PREFLIGHT_SAMPLE_LIMIT ?? 10);

function printStatusLine(status: AuthEmailReadinessStatus, key: string, detail: string) {
  console.log(`- [${status}] ${key}: ${detail}`);
}

function printSampleRows(
  label: string,
  rows: Array<AuthEmailNormalizationDrift | InvalidAuthEmailRecord>,
  buildRowSummary: (row: AuthEmailNormalizationDrift | InvalidAuthEmailRecord) => string,
) {
  if (rows.length === 0) {
    return;
  }

  console.log(`  ${label} (showing up to ${Math.min(rows.length, SAMPLE_LIMIT)}):`);
  for (const row of rows.slice(0, SAMPLE_LIMIT)) {
    console.log(`  - ${buildRowSummary(row)}`);
  }
}

function printDuplicateGroups(report: AuthEmailReadinessReport) {
  if (report.duplicateEmailGroups.length === 0) {
    return;
  }

  console.log(
    `  duplicate groups (showing up to ${Math.min(report.duplicateEmailGroups.length, SAMPLE_LIMIT)}):`,
  );
  for (const group of report.duplicateEmailGroups.slice(0, SAMPLE_LIMIT)) {
    const members = group.users
      .map((user) => `${user.id}:${JSON.stringify(user.email)}`)
      .join(", ");
    console.log(`  - ${group.normalizedEmail} -> ${members}`);
  }
}

async function main() {
  const [users, verificationTokens] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        id: "asc",
      },
    }),
    prisma.verificationToken.findMany({
      select: {
        identifier: true,
        token: true,
      },
      orderBy: {
        token: "asc",
      },
    }),
  ]);

  const report = assessAuthEmailReadiness({
    users,
    verificationTokens,
  });

  const failCount =
    (report.duplicateEmailGroups.length > 0 ? 1 : 0) +
    (report.invalidUserEmails.length > 0 ? 1 : 0);
  const warnCount =
    (report.userEmailNormalizationDrift.length > 0 ? 1 : 0) +
    (report.verificationIdentifierNormalizationDrift.length > 0 ? 1 : 0) +
    (report.invalidVerificationIdentifiers.length > 0 ? 1 : 0);
  const passCount = 5 - failCount - warnCount;

  console.log("Auth email readiness preflight");
  console.log(`- users: ${report.totalUsers}`);
  console.log(`- verificationTokens: ${report.totalVerificationTokens}`);

  if (report.duplicateEmailGroups.length > 0) {
    printStatusLine(
      "FAIL",
      "USER_EMAIL_CASE_INSENSITIVE_DUPLICATES",
      `${report.duplicateEmailGroups.length}개 normalized email group이 충돌합니다.`,
    );
    printDuplicateGroups(report);
  } else {
    printStatusLine("PASS", "USER_EMAIL_CASE_INSENSITIVE_DUPLICATES", "충돌 없음");
  }

  if (report.invalidUserEmails.length > 0) {
    printStatusLine(
      "FAIL",
      "USER_EMAIL_INVALID_ROWS",
      `${report.invalidUserEmails.length}개 user email이 정규화 후에도 유효한 이메일 형식이 아닙니다.`,
    );
    printSampleRows("invalid user emails", report.invalidUserEmails, (row) => {
      const invalidRow = row as InvalidAuthEmailRecord & { id?: string };
      return `${invalidRow.id ?? "unknown"} current=${JSON.stringify(invalidRow.currentValue)} normalized=${JSON.stringify(invalidRow.normalizedValue)}`;
    });
  } else {
    printStatusLine("PASS", "USER_EMAIL_INVALID_ROWS", "유효하지 않은 user email 없음");
  }

  if (report.userEmailNormalizationDrift.length > 0) {
    printStatusLine(
      "WARN",
      "USER_EMAIL_NORMALIZATION_DRIFT",
      `${report.userEmailNormalizationDrift.length}개 user email이 trim+lowercase로 재기록됩니다.`,
    );
    printSampleRows("user email drift", report.userEmailNormalizationDrift, (row) => {
      const driftRow = row as AuthEmailNormalizationDrift & { id?: string };
      return `${driftRow.id ?? "unknown"} current=${JSON.stringify(driftRow.currentValue)} normalized=${JSON.stringify(driftRow.normalizedValue)}`;
    });
  } else {
    printStatusLine("PASS", "USER_EMAIL_NORMALIZATION_DRIFT", "재기록 대상 없음");
  }

  if (report.verificationIdentifierNormalizationDrift.length > 0) {
    printStatusLine(
      "WARN",
      "VERIFICATION_IDENTIFIER_NORMALIZATION_DRIFT",
      `${report.verificationIdentifierNormalizationDrift.length}개 verification identifier가 trim+lowercase로 재기록됩니다.`,
    );
    printSampleRows(
      "verification identifier drift",
      report.verificationIdentifierNormalizationDrift,
      (row) => {
        const driftRow = row as AuthEmailNormalizationDrift & { token?: string };
        return `${driftRow.token ?? "unknown"} current=${JSON.stringify(driftRow.currentValue)} normalized=${JSON.stringify(driftRow.normalizedValue)}`;
      },
    );
  } else {
    printStatusLine(
      "PASS",
      "VERIFICATION_IDENTIFIER_NORMALIZATION_DRIFT",
      "재기록 대상 없음",
    );
  }

  if (report.invalidVerificationIdentifiers.length > 0) {
    printStatusLine(
      "WARN",
      "VERIFICATION_IDENTIFIER_INVALID_ROWS",
      `${report.invalidVerificationIdentifiers.length}개 verification identifier가 정규화 후에도 유효한 이메일 형식이 아닙니다.`,
    );
    printSampleRows(
      "invalid verification identifiers",
      report.invalidVerificationIdentifiers,
      (row) => {
        const invalidRow = row as InvalidAuthEmailRecord & { token?: string };
        return `${invalidRow.token ?? "unknown"} current=${JSON.stringify(invalidRow.currentValue)} normalized=${JSON.stringify(invalidRow.normalizedValue)}`;
      },
    );
  } else {
    printStatusLine(
      "PASS",
      "VERIFICATION_IDENTIFIER_INVALID_ROWS",
      "유효하지 않은 verification identifier 없음",
    );
  }

  console.log(`- summary: pass=${passCount}, warn=${warnCount}, fail=${failCount}`);

  if (report.status === "FAIL") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Auth email readiness preflight failed");
  console.error(error);
  process.exit(1);
});
