-- CreateTable
CREATE TABLE "GuestAuthor" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "fingerprintHash" TEXT,
    "ipDisplay" TEXT,
    "ipLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestAuthor_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "guestAuthorId" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "guestAuthorId" TEXT;

-- CreateIndex
CREATE INDEX "GuestAuthor_ipHash_createdAt_idx" ON "GuestAuthor"("ipHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GuestAuthor_fingerprintHash_createdAt_idx" ON "GuestAuthor"("fingerprintHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_guestAuthorId_createdAt_idx" ON "Post"("guestAuthorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Comment_guestAuthorId_createdAt_idx" ON "Comment"("guestAuthorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_guestAuthorId_fkey" FOREIGN KEY ("guestAuthorId") REFERENCES "GuestAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_guestAuthorId_fkey" FOREIGN KEY ("guestAuthorId") REFERENCES "GuestAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
