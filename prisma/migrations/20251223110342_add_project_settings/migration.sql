-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL,
    "updated_by" INTEGER NOT NULL,
    CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings_change_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "setting_key" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT NOT NULL,
    "reason" TEXT,
    "user_id" INTEGER NOT NULL,
    "setting_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settings_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "settings_change_logs_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "system_settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" DATETIME NOT NULL,
    "updated_by" INTEGER NOT NULL,
    CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_settings_change_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "setting_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT NOT NULL,
    "reason" TEXT,
    "changed_by" INTEGER NOT NULL,
    "setting_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_settings_change_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_settings_change_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "project_settings_change_logs_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "project_settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "project_settings_project_id_category_idx" ON "project_settings"("project_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_key_key" ON "project_settings"("project_id", "key");

-- CreateIndex
CREATE INDEX "project_settings_change_logs_project_id_setting_key_idx" ON "project_settings_change_logs"("project_id", "setting_key");

-- CreateIndex
CREATE INDEX "project_settings_change_logs_created_at_idx" ON "project_settings_change_logs"("created_at");
