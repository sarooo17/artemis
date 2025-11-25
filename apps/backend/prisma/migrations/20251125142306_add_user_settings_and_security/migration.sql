/*
  Warnings:

  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vat_number]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[domain]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `companies` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `billing_plan_id` VARCHAR(191) NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    ADD COLUMN `domain` VARCHAR(191) NULL,
    ADD COLUMN `employee_count` VARCHAR(191) NULL,
    ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    ADD COLUMN `logo` TEXT NULL,
    ADD COLUMN `sector` VARCHAR(191) NULL,
    ADD COLUMN `vat_number` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `role`,
    ADD COLUMN `avatar` TEXT NULL,
    ADD COLUMN `is_company_owner` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `onboarding_completed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phone_number` VARCHAR(191) NULL,
    ADD COLUMN `role_id` VARCHAR(191) NULL,
    MODIFY `hashed_password` VARCHAR(191) NULL,
    MODIFY `first_name` VARCHAR(191) NULL,
    MODIFY `last_name` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `user_settings` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `date_format` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
    `time_format` VARCHAR(191) NOT NULL DEFAULT '24h',
    `theme` VARCHAR(191) NOT NULL DEFAULT 'light',
    `accent_color` VARCHAR(191) NOT NULL DEFAULT '#3B82F6',
    `font_size` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `sidebar_collapsed` BOOLEAN NOT NULL DEFAULT false,
    `email_notifications` BOOLEAN NOT NULL DEFAULT true,
    `push_notifications` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_mentions` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_workflow_complete` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_team_updates` BOOLEAN NOT NULL DEFAULT true,
    `digest_frequency` VARCHAR(191) NOT NULL DEFAULT 'daily',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_settings_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_audit_logs_user_id_idx`(`user_id`),
    INDEX `security_audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fluentis_integrations` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `chat_session_id` VARCHAR(191) NULL,
    `flow_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `input_data` JSON NOT NULL,
    `fluentis_customer_id` VARCHAR(191) NULL,
    `fluentis_item_id` VARCHAR(191) NULL,
    `fluentis_order_id` VARCHAR(191) NULL,
    `fluentis_delivery_note_id` VARCHAR(191) NULL,
    `fluentis_invoice_id` VARCHAR(191) NULL,
    `current_step` VARCHAR(191) NULL,
    `error_message` TEXT NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fluentis_integrations_user_id_idx`(`user_id`),
    INDEX `fluentis_integrations_chat_session_id_idx`(`chat_session_id`),
    INDEX `fluentis_integrations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fluentis_workflow_steps` (
    `id` VARCHAR(191) NOT NULL,
    `integration_id` VARCHAR(191) NOT NULL,
    `step_name` VARCHAR(191) NOT NULL,
    `step_order` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `api_method` VARCHAR(191) NULL,
    `api_endpoint` VARCHAR(191) NULL,
    `request_payload` JSON NULL,
    `response_data` JSON NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `error_message` TEXT NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fluentis_workflow_steps_integration_id_idx`(`integration_id`),
    INDEX `fluentis_workflow_steps_step_order_idx`(`step_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otps` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otps_email_code_idx`(`email`, `code`),
    INDEX `otps_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_plans` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `price_monthly` DOUBLE NOT NULL,
    `price_yearly` DOUBLE NOT NULL,
    `max_users` INTEGER NOT NULL,
    `max_chat_sessions` INTEGER NOT NULL,
    `features` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `billing_plans_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `departments_company_id_idx`(`company_id`),
    UNIQUE INDEX `departments_company_id_name_key`(`company_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `department_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `max_users` INTEGER NOT NULL DEFAULT -1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `roles_department_id_idx`(`department_id`),
    UNIQUE INDEX `roles_department_id_name_key`(`department_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,

    INDEX `role_permissions_role_id_idx`(`role_id`),
    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invite_links` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `allowed_emails` JSON NOT NULL,
    `used_by` JSON NOT NULL,
    `max_uses` INTEGER NOT NULL DEFAULT -1,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invite_links_token_key`(`token`),
    INDEX `invite_links_company_id_idx`(`company_id`),
    INDEX `invite_links_role_id_idx`(`role_id`),
    INDEX `invite_links_token_idx`(`token`),
    INDEX `invite_links_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `companies_vat_number_key` ON `companies`(`vat_number`);

-- CreateIndex
CREATE UNIQUE INDEX `companies_domain_key` ON `companies`(`domain`);

-- CreateIndex
CREATE INDEX `companies_billing_plan_id_idx` ON `companies`(`billing_plan_id`);

-- CreateIndex
CREATE INDEX `users_role_id_idx` ON `users`(`role_id`);

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_billing_plan_id_fkey` FOREIGN KEY (`billing_plan_id`) REFERENCES `billing_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fluentis_integrations` ADD CONSTRAINT `fluentis_integrations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fluentis_integrations` ADD CONSTRAINT `fluentis_integrations_chat_session_id_fkey` FOREIGN KEY (`chat_session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fluentis_workflow_steps` ADD CONSTRAINT `fluentis_workflow_steps_integration_id_fkey` FOREIGN KEY (`integration_id`) REFERENCES `fluentis_integrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_links` ADD CONSTRAINT `invite_links_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_links` ADD CONSTRAINT `invite_links_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
