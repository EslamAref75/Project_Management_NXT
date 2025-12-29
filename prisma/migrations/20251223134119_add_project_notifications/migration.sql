-- CreateTable
CREATE TABLE "project_notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sound_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_notification_preferences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "task_notifications" BOOLEAN NOT NULL DEFAULT true,
    "dependency_notifications" BOOLEAN NOT NULL DEFAULT true,
    "today_task_notifications" BOOLEAN NOT NULL DEFAULT true,
    "project_admin_notifications" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "project_notification_preferences_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "project_notifications_project_id_user_id_is_read_idx" ON "project_notifications"("project_id", "user_id", "is_read");

-- CreateIndex
CREATE INDEX "project_notifications_entity_type_entity_id_idx" ON "project_notifications"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "project_notifications_created_at_idx" ON "project_notifications"("created_at");

-- CreateIndex
CREATE INDEX "project_notification_preferences_project_id_user_id_idx" ON "project_notification_preferences"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_notification_preferences_project_id_user_id_key" ON "project_notification_preferences"("project_id", "user_id");
