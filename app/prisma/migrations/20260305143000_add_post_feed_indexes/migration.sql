-- CreateIndex
CREATE INDEX IF NOT EXISTS "Post_type_scope_status_createdAt_idx"
ON "Post"("type", "scope", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Post_scope_status_createdAt_idx"
ON "Post"("scope", "status", "createdAt" DESC);
