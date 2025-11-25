-- CreateTable
CREATE TABLE `dashboard_categories` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboard_categories_user_id_idx`(`user_id`),
    INDEX `dashboard_categories_user_id_order_idx`(`user_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboards` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `layout` JSON NULL,
    `is_shared` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboards_category_id_idx`(`category_id`),
    INDEX `dashboards_user_id_idx`(`user_id`),
    INDEX `dashboards_category_id_order_idx`(`category_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_widgets` (
    `id` VARCHAR(191) NOT NULL,
    `dashboard_id` VARCHAR(191) NOT NULL,
    `chat_session_id` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `config` JSON NOT NULL,
    `data` JSON NOT NULL,
    `position` JSON NOT NULL,
    `refresh_rate` INTEGER NULL,
    `last_refresh` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboard_widgets_dashboard_id_idx`(`dashboard_id`),
    INDEX `dashboard_widgets_chat_session_id_idx`(`chat_session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dashboard_categories` ADD CONSTRAINT `dashboard_categories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `dashboard_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_widgets` ADD CONSTRAINT `dashboard_widgets_dashboard_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_widgets` ADD CONSTRAINT `dashboard_widgets_chat_session_id_fkey` FOREIGN KEY (`chat_session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
