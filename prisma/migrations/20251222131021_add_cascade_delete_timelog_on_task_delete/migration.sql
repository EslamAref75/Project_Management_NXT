-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_time_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hours_logged" REAL NOT NULL,
    "description" TEXT,
    "log_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "subtask_id" INTEGER,
    CONSTRAINT "time_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "time_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "time_logs_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "subtasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_time_logs" ("created_at", "description", "hours_logged", "id", "log_date", "subtask_id", "task_id", "user_id") SELECT "created_at", "description", "hours_logged", "id", "log_date", "subtask_id", "task_id", "user_id" FROM "time_logs";
DROP TABLE "time_logs";
ALTER TABLE "new_time_logs" RENAME TO "time_logs";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
