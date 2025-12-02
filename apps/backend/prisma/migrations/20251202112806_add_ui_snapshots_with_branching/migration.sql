-- DropForeignKey
ALTER TABLE `dashboard_categories` DROP FOREIGN KEY `dashboard_categories_user_id_fkey`;

-- DropIndex
DROP INDEX `dashboard_categories_user_id_is_default_key` ON `dashboard_categories`;

-- DropIndex
DROP INDEX `refresh_tokens_token_idx` ON `refresh_tokens`;

-- AlterTable
ALTER TABLE `chat_messages` ADD COLUMN `metadata` JSON NULL;

-- CreateTable
CREATE TABLE `ui_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `branch_name` VARCHAR(191) NOT NULL DEFAULT 'main',
    `parent_id` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL,
    `layout_intent` VARCHAR(191) NOT NULL,
    `snapshot_index` INTEGER NOT NULL,
    `metadata` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ui_snapshots_session_id_branch_name_snapshot_index_idx`(`session_id`, `branch_name`, `snapshot_index`),
    INDEX `ui_snapshots_session_id_is_active_idx`(`session_id`, `is_active`),
    INDEX `ui_snapshots_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ui_snapshots` ADD CONSTRAINT `ui_snapshots_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ui_snapshots` ADD CONSTRAINT `ui_snapshots_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `chat_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ui_snapshots` ADD CONSTRAINT `ui_snapshots_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `ui_snapshots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
