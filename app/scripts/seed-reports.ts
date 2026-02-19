import "dotenv/config";
import {
  PrismaClient,
  ReportReason,
  ReportStatus,
  ReportTarget,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();
const seedTag = "seed:report";

type SeedReportInput = {
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  targetUserId?: string | null;
  reason: ReportReason;
  status: ReportStatus;
  resolution?: string;
  resolvedBy?: string;
};

async function ensureUser(
  email: string,
  name: string,
  role: UserRole = UserRole.USER,
) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role },
  });
}

async function createReport(input: SeedReportInput) {
  const isResolved = input.status !== ReportStatus.PENDING;
  const resolvedAt = isResolved ? new Date() : null;

  const report = await prisma.report.create({
    data: {
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetUserId: input.targetUserId ?? null,
      reason: input.reason,
      description: `${seedTag}:${input.reason}`,
      status: input.status,
      resolution: input.resolution ?? null,
      resolvedAt,
      resolvedBy: input.resolvedBy ?? null,
    },
  });

  if (isResolved) {
    await prisma.reportAudit.create({
      data: {
        reportId: report.id,
        status: input.status,
        resolution: input.resolution ?? null,
        resolvedBy: input.resolvedBy ?? null,
      },
    });
  }

  return report;
}

async function main() {
  const existing = await prisma.report.findFirst({
    where: { description: { contains: seedTag } },
  });

  if (existing) {
    await prisma.report.deleteMany({
      where: { description: { contains: seedTag } },
    });
    console.log("Existing seed reports cleared.");
  }

  const demoEmail = process.env.DEMO_USER_EMAIL ?? "demo@townpet.dev";
  const [demoUser, reporterA, reporterB, moderator] = await Promise.all([
    ensureUser(demoEmail, "TownPet Demo"),
    ensureUser("reporter1@townpet.dev", "Report Seed A"),
    ensureUser("reporter2@townpet.dev", "Report Seed B"),
    ensureUser("moderator@townpet.dev", "Report Moderator", UserRole.MODERATOR),
  ]);

  const posts = await prisma.post.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    select: { id: true, authorId: true },
  });

  if (posts.length === 0) {
    console.log("No posts available to seed reports.");
    return;
  }

  const primaryPost = posts[0];
  const secondaryPost = posts[1] ?? posts[0];

  await createReport({
    reporterId: reporterA.id,
    targetType: ReportTarget.POST,
    targetId: primaryPost.id,
    reason: ReportReason.SPAM,
    status: ReportStatus.PENDING,
  });

  await createReport({
    reporterId: reporterB.id,
    targetType: ReportTarget.COMMENT,
    targetId: primaryPost.id,
    reason: ReportReason.HARASSMENT,
    status: ReportStatus.PENDING,
  });

  await createReport({
    reporterId: reporterA.id,
    targetType: ReportTarget.USER,
    targetId: secondaryPost.id,
    targetUserId: demoUser.id,
    reason: ReportReason.OTHER,
    status: ReportStatus.PENDING,
  });

  await createReport({
    reporterId: reporterB.id,
    targetType: ReportTarget.POST,
    targetId: secondaryPost.id,
    reason: ReportReason.INAPPROPRIATE,
    status: ReportStatus.RESOLVED,
    resolution: "내용 확인 후 승인 처리",
    resolvedBy: moderator.id,
  });

  await createReport({
    reporterId: reporterA.id,
    targetType: ReportTarget.POST,
    targetId: primaryPost.id,
    reason: ReportReason.FAKE,
    status: ReportStatus.DISMISSED,
    resolution: "허위 신고로 판단",
    resolvedBy: moderator.id,
  });

  await createReport({
    reporterId: reporterB.id,
    targetType: ReportTarget.COMMENT,
    targetId: primaryPost.id,
    reason: ReportReason.SPAM,
    status: ReportStatus.RESOLVED,
    resolution: "댓글 삭제 안내",
    resolvedBy: moderator.id,
  });

  await createReport({
    reporterId: reporterA.id,
    targetType: ReportTarget.USER,
    targetId: secondaryPost.id,
    targetUserId: demoUser.id,
    reason: ReportReason.OTHER,
    status: ReportStatus.DISMISSED,
    resolution: "사용자 신고 근거 부족",
    resolvedBy: moderator.id,
  });

  console.log("Seed reports created.");
}

main()
  .catch((error) => {
    console.error("Seed reports failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
