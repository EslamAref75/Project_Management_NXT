-- Add is_urgent column to project_statuses
ALTER TABLE "project_statuses" ADD COLUMN "is_urgent" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "project_statuses_is_urgent_idx" ON "project_statuses"("is_urgent");

-- Create task_statuses table
CREATE TABLE IF NOT EXISTS "task_statuses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "is_default" INTEGER NOT NULL DEFAULT 0,
    "is_final" INTEGER NOT NULL DEFAULT 0,
    "is_blocking" INTEGER NOT NULL DEFAULT 0,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "task_statuses_is_active_idx" ON "task_statuses"("is_active");
CREATE INDEX IF NOT EXISTS "task_statuses_order_index_idx" ON "task_statuses"("order_index");
CREATE INDEX IF NOT EXISTS "task_statuses_is_default_idx" ON "task_statuses"("is_default");
CREATE INDEX IF NOT EXISTS "task_statuses_is_blocking_idx" ON "task_statuses"("is_blocking");

-- Add task_status_id column to tasks table
ALTER TABLE "tasks" ADD COLUMN "task_status_id" INTEGER;

CREATE INDEX IF NOT EXISTS "tasks_task_status_id_idx" ON "tasks"("task_status_id");

-- Insert default task statuses
INSERT OR IGNORE INTO "task_statuses" ("name", "color", "is_default", "is_final", "is_blocking", "order_index", "is_active") VALUES
('To Do', '#6b7280', 1, 0, 0, 0, 1),
('In Progress', '#3b82f6', 0, 0, 0, 1, 1),
('Review', '#f59e0b', 0, 0, 0, 2, 1),
('Blocked', '#ef4444', 0, 0, 1, 3, 1),
('Done', '#10b981', 0, 1, 0, 4, 1);

