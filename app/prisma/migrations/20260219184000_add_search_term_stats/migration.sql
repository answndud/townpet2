CREATE TABLE "SearchTermStat" (
  "termNormalized" TEXT NOT NULL,
  "termDisplay" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchTermStat_pkey" PRIMARY KEY ("termNormalized")
);

CREATE INDEX "SearchTermStat_count_updatedAt_idx"
ON "SearchTermStat"("count" DESC, "updatedAt" DESC);

CREATE INDEX "SearchTermStat_updatedAt_idx"
ON "SearchTermStat"("updatedAt" DESC);
