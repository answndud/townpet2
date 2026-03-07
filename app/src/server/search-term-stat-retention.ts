type SearchTermStatCleanupDelegate = {
  deleteMany(args: {
    where: {
      updatedAt: {
        lt: Date;
      };
    };
  }): Promise<{ count: number }>;
};

export function resolveSearchTermRetentionDays(raw = process.env.SEARCH_TERM_RETENTION_DAYS) {
  const retentionDays = Number(raw ?? "90");
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error("SEARCH_TERM_RETENTION_DAYS must be a positive number.");
  }

  return retentionDays;
}

export function buildSearchTermRetentionCutoff(retentionDays: number, now = new Date()) {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

export async function cleanupSearchTermStats(params: {
  delegate: SearchTermStatCleanupDelegate;
  retentionDays: number;
  now?: Date;
}) {
  const cutoff = buildSearchTermRetentionCutoff(params.retentionDays, params.now);
  const result = await params.delegate.deleteMany({
    where: {
      updatedAt: {
        lt: cutoff,
      },
    },
  });

  return {
    count: result.count,
    cutoff,
  };
}
