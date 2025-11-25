-- AlterTable
ALTER TABLE `chat_sessions` ADD COLUMN `is_archived` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `chat_sessions_user_id_is_archived_idx` ON `chat_sessions`(`user_id`, `is_archived`);
