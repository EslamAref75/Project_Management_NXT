-- AddCommentMentions
-- This migration adds the comment_mentions table to track user mentions in comments

-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comment_mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "comment_mentions_comment_id_user_id_key" ON "comment_mentions"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "comment_mentions_user_id_idx" ON "comment_mentions"("user_id");

-- CreateIndex
CREATE INDEX "comment_mentions_comment_id_idx" ON "comment_mentions"("comment_id");

