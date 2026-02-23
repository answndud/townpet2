CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Post_title_trgm_idx"
ON "Post"
USING GIN ("title" gin_trgm_ops);

CREATE INDEX "Post_content_trgm_idx"
ON "Post"
USING GIN ("content" gin_trgm_ops);

CREATE INDEX "Post_search_tsv_idx"
ON "Post"
USING GIN ((
  setweight(to_tsvector('simple', COALESCE("title", '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE("content", '')), 'B')
));

CREATE INDEX "User_nickname_trgm_idx"
ON "User"
USING GIN ((COALESCE("nickname", '')) gin_trgm_ops);

CREATE INDEX "User_name_trgm_idx"
ON "User"
USING GIN ((COALESCE("name", '')) gin_trgm_ops);

CREATE INDEX "User_search_tsv_idx"
ON "User"
USING GIN ((
  to_tsvector('simple', (COALESCE("nickname", '') || ' ' || COALESCE("name", '')))
));
