-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "due_date" DATETIME,
    "planned_date" DATETIME,
    "estimated_hours" REAL NOT NULL DEFAULT 0.0,
    "actual_hours" REAL NOT NULL DEFAULT 0.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "project_id" INTEGER NOT NULL,
    "team_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "deliverable_id" INTEGER,
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "deliverables" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("actual_hours", "created_at", "created_by_id", "deliverable_id", "description", "due_date", "estimated_hours", "id", "planned_date", "priority", "project_id", "status", "team_id", "title", "updated_at") SELECT "actual_hours", "created_at", "created_by_id", "deliverable_id", "description", "due_date", "estimated_hours", "id", "planned_date", "priority", "project_id", "status", "team_id", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
