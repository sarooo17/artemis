-- AlterTable
ALTER TABLE `user_settings` ADD COLUMN `default_chart_type` VARCHAR(191) NULL DEFAULT 'bar',
    ADD COLUMN `default_date_range` VARCHAR(191) NULL DEFAULT 'month',
    ADD COLUMN `default_table_page_size` INTEGER NULL DEFAULT 50,
    ADD COLUMN `favorite_customers` JSON NULL,
    ADD COLUMN `favorite_items` JSON NULL,
    ADD COLUMN `frequent_queries` JSON NULL,
    ADD COLUMN `preferred_warehouse` VARCHAR(191) NULL,
    ADD COLUMN `recently_viewed` JSON NULL,
    ADD COLUMN `saved_filters` JSON NULL;
