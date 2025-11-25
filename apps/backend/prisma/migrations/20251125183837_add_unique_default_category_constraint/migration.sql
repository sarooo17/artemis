/*
  Warnings:

  - A unique constraint covering the columns `[user_id,is_default]` on the table `dashboard_categories` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `dashboard_categories_user_id_is_default_key` ON `dashboard_categories`(`user_id`, `is_default`);
