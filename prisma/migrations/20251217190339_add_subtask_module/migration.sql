/*
  Warnings:

  - Added the required column `created_by_id` to the `subtasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "subtask_dependencies" (
    "subtask_id" INTEGER NOT NULL,
    "depends_on_subtask_id" INTEGER NOT NULL,
    "dependency_type" TEXT NOT NULL DEFAULT 'finish_to_start',
    "created_by_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("subtask_id", "depends_on_subtask_id"),
    CONSTRAINT "subtask_dependencies_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "subtasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subtask_dependencies_depends_on_subtask_id_fkey" FOREIGN KEY ("depends_on_subtask_id") REFERENCES "subtasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_subtasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "start_date" DATETIME,
    "due_date" DATETIME,
    "estimated_hours" REAL NOT NULL DEFAULT 0.0,
    "actual_hours" REAL NOT NULL DEFAULT 0.0,
    "parent_task_id" INTEGER NOT NULL,
    "assigned_to_id" INTEGER,
    "team_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "subtasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subtasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subtasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subtasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_subtasks" ("actual_hours", "assigned_to_id", "created_at", "description", "due_date", "estimated_hours", "id", "parent_task_id", "priority", "status", "title", "updated_at") SELECT "actual_hours", "assigned_to_id", "created_at", "description", "due_date", "estimated_hours", "id", "parent_task_id", "priority", "status", "title", "updated_at" FROM "subtasks";
DROP TABLE "subtasks";
ALTER TABLE "new_subtasks" RENAME TO "subtasks";
CREATE TABLE "new_comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "task_id" INTEGER,
    "subtask_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    CONSTRAINT "comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "subtasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_comments" ("content", "created_at", "id", "task_id", "user_id") SELECT "content", "created_at", "id", "task_id", "user_id" FROM "comments";
DROP TABLE "comments";
ALTER TABLE "new_comments" RENAME TO "comments";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
