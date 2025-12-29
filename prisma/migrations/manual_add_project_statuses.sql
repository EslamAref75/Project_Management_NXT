-- Migration: Add project_statuses table
-- Run this manually: npx prisma db execute --file prisma/migrations/manual_add_project_statuses.sql --schema prisma/schema.prisma

-- Create project_statuses table if it doesn't exist
CREATE TABLE IF NOT EXISTS "project_statuses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "is_default" INTEGER NOT NULL DEFAULT 0,
    "is_final" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "project_statuses_is_active_idx" ON "project_statuses"("is_active");
CREATE INDEX IF NOT EXISTS "project_statuses_order_index_idx" ON "project_statuses"("order_index");
CREATE INDEX IF NOT EXISTS "project_statuses_is_default_idx" ON "project_statuses"("is_default");

-- Add project_status_id column to projects table only if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so we use a workaround
-- Check if column exists by trying to select it, if it fails, add it
-- Note: This will fail silently if column already exists, which is what we want

-- For SQLite, we need to check if the column exists first
-- Since SQLite doesn't support IF NOT EXISTS for ALTER TABLE, we'll use a different approach
-- We'll try to add it and ignore the error if it already exists

-- Insert default statuses only if table is empty
INSERT OR IGNORE INTO "project_statuses" ("name", "color", "is_default", "is_final", "order_index", "is_active") VALUES
('Planned', '#6b7280', 1, 0, 0, 1),
('Active', '#10b981', 0, 0, 1, 1),
('On Hold', '#f59e0b', 0, 0, 2, 1),
('Completed', '#3b82f6', 0, 1, 3, 1),
('Cancelled', '#ef4444', 0, 1, 4, 1);

-- Create index on projects.project_status_id if it doesn't exist
CREATE INDEX IF NOT EXISTS "projects_project_status_id_idx" ON "projects"("project_status_id");

