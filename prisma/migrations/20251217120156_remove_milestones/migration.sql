/*
  Warnings:

  - You are about to drop the `milestones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `milestone_id` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `code` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `task_dependencies` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "milestones";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "project_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "allocation_percentage" INTEGER NOT NULL DEFAULT 100,
    "joined_at" DATETIME NOT NULL,
    "left_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_phases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence_order" INTEGER NOT NULL,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_phases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "acceptance_criteria" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "deliverables_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scope_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "scope_text" TEXT NOT NULL,
    "change_reason" TEXT,
    "changed_by_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scope_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "scope_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "project_manager_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_project_manager_id_fkey" FOREIGN KEY ("project_manager_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("created_at", "created_by", "description", "id", "name", "status", "updated_at") SELECT "created_at", "created_by", "description", "id", "name", "status", "updated_at" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");
CREATE TABLE "new_task_dependencies" (
    "task_id" INTEGER NOT NULL,
    "depends_on_task_id" INTEGER NOT NULL,
    "dependency_type" TEXT NOT NULL DEFAULT 'finish_to_start',
    "created_by_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("task_id", "depends_on_task_id"),
    CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_task_dependencies" ("created_at", "depends_on_task_id", "task_id") SELECT "created_at", "depends_on_task_id", "task_id" FROM "task_dependencies";
DROP TABLE "task_dependencies";
ALTER TABLE "new_task_dependencies" RENAME TO "task_dependencies";
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
    "assigned_to_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "deliverable_id" INTEGER,
    CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_deliverable_id_fkey" FOREIGN KEY ("deliverable_id") REFERENCES "deliverables" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("actual_hours", "assigned_to_id", "created_at", "created_by_id", "description", "due_date", "estimated_hours", "id", "planned_date", "priority", "project_id", "status", "team_id", "title", "updated_at") SELECT "actual_hours", "assigned_to_id", "created_at", "created_by_id", "description", "due_date", "estimated_hours", "id", "planned_date", "priority", "project_id", "status", "team_id", "title", "updated_at" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "project_users_project_id_user_id_joined_at_key" ON "project_users"("project_id", "user_id", "joined_at");
