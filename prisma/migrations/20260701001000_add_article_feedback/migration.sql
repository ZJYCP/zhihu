-- Add public article feedback collection and admin feedback management.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackStatus') THEN
    CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'RESOLVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackType') THEN
    CREATE TYPE "FeedbackType" AS ENUM ('INCOMPLETE_CONTENT', 'GARBLED_TEXT', 'MISSING_IMAGE', 'OTHER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ArticleFeedback" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "type" "FeedbackType" NOT NULL,
  "content" TEXT NOT NULL,
  "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ArticleFeedback_taskId_createdAt_idx" ON "ArticleFeedback"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "ArticleFeedback_status_createdAt_idx" ON "ArticleFeedback"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ArticleFeedback_taskId_fkey'
  ) THEN
    ALTER TABLE "ArticleFeedback"
      ADD CONSTRAINT "ArticleFeedback_taskId_fkey"
      FOREIGN KEY ("taskId") REFERENCES "CrawlTask"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
