-- Full-text search vectors as STORED generated columns.
-- Config 'russian' stems Cyrillic and still tokenizes Latin words; the text-search
-- parser classifies HTML tags as a separate token type that the config ignores,
-- so indexing contentHtml directly skips markup and indexes only visible words.

-- array_to_string is only STABLE, which a generated column rejects. Wrap it in an
-- IMMUTABLE SQL function (deterministic for text[]) so aliases can be indexed.
CREATE OR REPLACE FUNCTION kripipasta_array_text(text[])
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT array_to_string($1, ' ') $$;

-- Story: title (A) > intro (B) > body (C)
ALTER TABLE "Story" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('russian', coalesce("intro", '')), 'B') ||
    setweight(to_tsvector('russian', coalesce("contentHtml", '')), 'C')
  ) STORED;

-- Dossier: name + aliases (A) > epithet + category (B) > lead + origin (C)
ALTER TABLE "Dossier" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('russian', kripipasta_array_text("aliases")), 'A') ||
    setweight(to_tsvector('russian', coalesce("epithet", '')), 'B') ||
    setweight(to_tsvector('russian', coalesce("category", '')), 'B') ||
    setweight(to_tsvector('russian', coalesce("lead", '')), 'C') ||
    setweight(to_tsvector('russian', coalesce("origin", '')), 'C')
  ) STORED;

-- CreateIndex
CREATE INDEX "Story_searchVector_idx" ON "Story" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Dossier_searchVector_idx" ON "Dossier" USING GIN ("searchVector");
