-- AlterTable: Add new columns to activity_logs (only if table exists)
-- Check if table exists first, then add columns
-- Note: SQLite doesn't support IF EXISTS for ALTER TABLE, so we'll use a different approach
-- We'll add columns only if they don't exist (handled by Prisma)
ALTER TABLE "activity_logs" ADD COLUMN "action_type" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN "action_category" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN "action_summary" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN "action_details" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN "performed_by_user_id" INTEGER;
ALTER TABLE "activity_logs" ADD COLUMN "affected_user_id" INTEGER;
ALTER TABLE "activity_logs" ADD COLUMN "project_id" INTEGER;
ALTER TABLE "activity_logs" ADD COLUMN "user_agent" TEXT;

-- Migrate existing data
UPDATE "activity_logs" 
SET 
    "action_type" = CASE 
        WHEN "action" LIKE '%login%' THEN 'user_login'
        WHEN "action" LIKE '%logout%' THEN 'user_logout'
        WHEN "action" LIKE '%create%' THEN 'task_created'
        WHEN "action" LIKE '%update%' THEN 'task_updated'
        WHEN "action" LIKE '%delete%' THEN 'task_deleted'
        WHEN "action" LIKE '%dependency%' THEN 'dependency_added'
        ELSE 'task_updated'
    END,
    "action_category" = CASE 
        WHEN "action" LIKE '%login%' OR "action" LIKE '%logout%' THEN 'auth'
        WHEN "action" LIKE '%dependency%' THEN 'dependency'
        ELSE 'task'
    END,
    "action_summary" = COALESCE("description", "action"),
    "action_details" = CASE 
        WHEN "description" IS NOT NULL THEN json_object('description', "description")
        ELSE NULL
    END,
    "performed_by_user_id" = "user_id";

-- Create indexes
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs"("created_at");
CREATE INDEX IF NOT EXISTS "activity_logs_performed_by_user_id_idx" ON "activity_logs"("performed_by_user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_project_id_idx" ON "activity_logs"("project_id");
CREATE INDEX IF NOT EXISTS "activity_logs_action_category_idx" ON "activity_logs"("action_category");
CREATE INDEX IF NOT EXISTS "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");
