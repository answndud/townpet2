CREATE TYPE "UploadStorageProvider" AS ENUM ('LOCAL', 'BLOB');
CREATE TYPE "UploadAssetStatus" AS ENUM ('TEMPORARY', 'ATTACHED', 'DELETED');

CREATE TABLE "UploadAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "thumbnailStorageKey" TEXT,
    "storageProvider" "UploadStorageProvider" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" "UploadAssetStatus" NOT NULL DEFAULT 'TEMPORARY',
    "ownerUserId" TEXT,
    "attachedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadAsset_url_key" ON "UploadAsset"("url");
CREATE UNIQUE INDEX "UploadAsset_storageKey_key" ON "UploadAsset"("storageKey");
CREATE UNIQUE INDEX "UploadAsset_thumbnailUrl_key" ON "UploadAsset"("thumbnailUrl");
CREATE UNIQUE INDEX "UploadAsset_thumbnailStorageKey_key" ON "UploadAsset"("thumbnailStorageKey");
CREATE INDEX "UploadAsset_status_createdAt_idx" ON "UploadAsset"("status", "createdAt" ASC);
CREATE INDEX "UploadAsset_ownerUserId_status_createdAt_idx" ON "UploadAsset"("ownerUserId", "status", "createdAt" DESC);

ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
