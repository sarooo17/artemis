-- AlterTable
ALTER TABLE `users` ADD COLUMN `company_id` VARCHAR(191) NULL,
    ADD COLUMN `first_name` VARCHAR(191) NOT NULL DEFAULT 'User',
    ADD COLUMN `last_name` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'User';

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_company_id_idx` ON `users`(`company_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
