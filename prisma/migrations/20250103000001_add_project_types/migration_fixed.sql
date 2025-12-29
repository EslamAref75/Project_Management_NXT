-- CreateTable (only if it doesn't exist)
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

-- CreateIndex (only if they don't exist)
CREATE INDEX IF NOT EXISTS "project_types_is_active_idx" ON "project_types"("is_active");
CREATE INDEX IF NOT EXISTS "project_types_display_order_idx" ON "project_types"("display_order");

-- AddColumn (only if it doesn't exist)
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll check manually or use a different approach

