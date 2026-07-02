-- Baseline the schema that already exists in deployments created before
-- Prisma Migrate was adopted. Existing production databases should mark this
-- migration as applied with `prisma migrate resolve --applied ...`.

CREATE SCHEMA IF NOT EXISTS "public";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Status') THEN
    CREATE TYPE "Status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CrawlTask" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'PENDING',
  "title" TEXT,
  "content" TEXT,
  "html" TEXT,
  "author" TEXT,
  "column" TEXT,
  "error" TEXT,
  "fontDecodeSuccess" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "content_preview" TEXT,
  CONSTRAINT "CrawlTask_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CrawlTask" ADD COLUMN IF NOT EXISTS "html" TEXT;
ALTER TABLE "CrawlTask" ADD COLUMN IF NOT EXISTS "column" TEXT;
ALTER TABLE "CrawlTask" ADD COLUMN IF NOT EXISTS "fontDecodeSuccess" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CrawlTask" ADD COLUMN IF NOT EXISTS "content_preview" TEXT;

DO $$
DECLARE
  content_preview_is_generated BOOLEAN;
BEGIN
  SELECT attgenerated <> ''
  INTO content_preview_is_generated
  FROM pg_attribute
  WHERE attrelid = '"CrawlTask"'::regclass
    AND attname = 'content_preview'
    AND NOT attisdropped;

  IF content_preview_is_generated IS NOT TRUE THEN
    CREATE OR REPLACE FUNCTION "set_crawl_task_content_preview"()
    RETURNS trigger AS $trigger$
    BEGIN
      NEW."content_preview" := left(NEW."content", 600);
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS "CrawlTask_content_preview_trigger" ON "CrawlTask";
    CREATE TRIGGER "CrawlTask_content_preview_trigger"
      BEFORE INSERT OR UPDATE OF "content" ON "CrawlTask"
      FOR EACH ROW
      EXECUTE FUNCTION "set_crawl_task_content_preview"();

    UPDATE "CrawlTask"
    SET "content_preview" = left("content", 600)
    WHERE "content_preview" IS NULL AND "content" IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SystemConfig" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CookieCheckLog" (
  "id" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "message" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CookieCheckLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RateLimitLog" (
  "id" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrawlTask_status_createdAt_idx" ON "CrawlTask"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "CrawlTask_status_idx" ON "CrawlTask"("status");
CREATE INDEX IF NOT EXISTS "CrawlTask_url_idx" ON "CrawlTask"("url");
CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key");
CREATE INDEX IF NOT EXISTS "CookieCheckLog_checkedAt_idx" ON "CookieCheckLog"("checkedAt");
CREATE INDEX IF NOT EXISTS "RateLimitLog_ip_createdAt_idx" ON "RateLimitLog"("ip", "createdAt");
