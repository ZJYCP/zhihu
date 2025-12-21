-- Migration: 0001_initial
-- Created at: 2024-12-22

CREATE TABLE IF NOT EXISTS crawl_tasks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  title TEXT,
  content TEXT,
  html TEXT,
  author TEXT,
  "column" TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crawl_tasks_status ON crawl_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crawl_tasks_created_at ON crawl_tasks(created_at);
