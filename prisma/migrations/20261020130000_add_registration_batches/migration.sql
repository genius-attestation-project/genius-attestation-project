-- CreateTable
CREATE TABLE `registration_batches` (
    `id` VARCHAR(191) NOT NULL,
    `batch_number` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `registration_batches_batch_number_key`(`batch_number`),
    INDEX `registration_batches_lead_id_idx`(`lead_id`),
    INDEX `registration_batches_owner_admin_id_idx`(`owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `registrations` ADD COLUMN `registration_batch_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `registrations_registration_batch_id_idx` ON `registrations`(`registration_batch_id`);

-- AddForeignKey
ALTER TABLE `registration_batches` ADD CONSTRAINT `registration_batches_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_registration_batch_id_fkey` FOREIGN KEY (`registration_batch_id`) REFERENCES `registration_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
