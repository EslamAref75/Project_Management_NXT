-- CreateTable
CREATE TABLE "user_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "updated_by" INTEGER NOT NULL,
    CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_settings_change_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "setting_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT NOT NULL,
    "reason" TEXT,
    "changed_by" INTEGER NOT NULL,
    "setting_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_settings_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_settings_change_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_settings_change_logs_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "user_settings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_settings_user_id_category_idx" ON "user_settings"("user_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key_key" ON "user_settings"("user_id", "key");

-- CreateIndex
CREATE INDEX "user_settings_change_logs_user_id_setting_key_idx" ON "user_settings_change_logs"("user_id", "setting_key");

-- CreateIndex
CREATE INDEX "user_settings_change_logs_created_at_idx" ON "user_settings_change_logs"("created_at");
