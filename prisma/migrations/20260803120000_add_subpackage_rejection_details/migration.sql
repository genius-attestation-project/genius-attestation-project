-- Preserve the rejection audit details on the activity movement itself.
ALTER TABLE `sub_package_movements`
    ADD COLUMN `rejected_by` VARCHAR(191) NULL,
    ADD COLUMN `rejection_reason` TEXT NULL;
