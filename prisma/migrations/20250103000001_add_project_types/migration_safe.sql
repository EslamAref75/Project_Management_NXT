-- Create project_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS "project_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "project_types_is_active_idx" ON "project_types"("is_active");
CREATE INDEX IF NOT EXISTS "project_types_display_order_idx" ON "project_types"("display_order");

-- Note: project_type_id column already exists, so we skip adding it
-- Create index on project_type_id if it doesn't exist
CREATE INDEX IF NOT EXISTS "projects_project_type_id_idx" ON "projects"("project_type_id");

