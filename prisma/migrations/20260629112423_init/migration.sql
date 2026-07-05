-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL DEFAULT 'credentials',
    `role_id` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `supervisor_user_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `department_id` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `office_location_id` VARCHAR(191) NULL,
    `officeLocation` VARCHAR(191) NULL,
    `monthly_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `lock_reason` VARCHAR(191) NULL,
    `locked_at` DATETIME(3) NULL,
    `locked_followup_lead_id` VARCHAR(191) NULL,
    `locked_followup_at` DATETIME(3) NULL,
    `unlocked_by` VARCHAR(191) NULL,
    `unlock_reason` VARCHAR(191) NULL,
    `unlocked_at` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_department_id_idx`(`department_id`),
    INDEX `users_office_location_id_idx`(`office_location_id`),
    INDEX `users_supervisor_user_id_idx`(`supervisor_user_id`),
    INDEX `users_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `users_is_locked_idx`(`is_locked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `departments_owner_admin_id_idx`(`owner_admin_id`),
    UNIQUE INDEX `departments_name_owner_admin_id_key`(`name`, `owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `office_locations` (
    `id` VARCHAR(191) NOT NULL,
    `office_name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL,
    `employees` INTEGER NOT NULL DEFAULT 0,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `office_locations_owner_admin_id_idx`(`owner_admin_id`),
    UNIQUE INDEX `office_locations_office_name_owner_admin_id_key`(`office_name`, `owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` VARCHAR(191) NULL,
    `access_token` VARCHAR(191) NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` VARCHAR(191) NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `leadCode` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT '+91',
    `mobileNumber` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `docType` VARCHAR(191) NULL,
    `noOfDocuments` INTEGER NULL,
    `country` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `documentIssuedCountry` VARCHAR(191) NULL,
    `service` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NULL,
    `leadStatus` ENUM('New', 'Followup', 'Assigned', 'Pending_Approval', 'Closed', 'Qualified', 'Potential_Qualified', 'LOB') NOT NULL DEFAULT 'New',
    `clientType` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `workingDays` INTEGER NULL,
    `remark` VARCHAR(191) NULL,
    `assignedUser` VARCHAR(191) NULL,
    `assigned_user_id` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `nextFollowupAt` DATETIME(3) NULL,
    `followup_notified` BOOLEAN NOT NULL DEFAULT false,
    `followup_completed` BOOLEAN NOT NULL DEFAULT false,
    `followup_status` ENUM('Pending', 'Completed', 'Rescheduled') NOT NULL DEFAULT 'Pending',
    `completion_description` VARCHAR(191) NULL,
    `followup_completion_note` VARCHAR(191) NULL,
    `followup_completed_at` DATETIME(3) NULL,
    `snooze_note` VARCHAR(191) NULL,
    `completed_at` DATETIME(3) NULL,
    `completed_by` VARCHAR(191) NULL,
    `snoozed_at` DATETIME(3) NULL,
    `snoozed_by` VARCHAR(191) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lead_leadCode_key`(`leadCode`),
    INDEX `Lead_leadStatus_idx`(`leadStatus`),
    INDEX `Lead_createdAt_idx`(`createdAt`),
    INDEX `Lead_service_idx`(`service`),
    INDEX `Lead_email_idx`(`email`),
    INDEX `Lead_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `Lead_created_by_id_idx`(`created_by_id`),
    INDEX `Lead_assigned_user_id_idx`(`assigned_user_id`),
    INDEX `Lead_followup_status_idx`(`followup_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_followup_history` (
    `id` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NOT NULL,
    `action_type` ENUM('Created', 'Snoozed', 'Completed', 'Rescheduled') NOT NULL,
    `old_date` DATETIME(3) NULL,
    `new_date` DATETIME(3) NULL,
    `description` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `owner_admin_id` VARCHAR(191) NULL,

    INDEX `lead_followup_history_lead_id_idx`(`lead_id`),
    INDEX `lead_followup_history_action_type_idx`(`action_type`),
    INDEX `lead_followup_history_user_id_idx`(`user_id`),
    INDEX `lead_followup_history_created_at_idx`(`created_at`),
    INDEX `lead_followup_history_owner_admin_id_idx`(`owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NOT NULL,
    `previous_status` ENUM('New', 'Followup', 'Assigned', 'Pending_Approval', 'Closed', 'Qualified', 'Potential_Qualified', 'LOB') NOT NULL,
    `new_status` ENUM('New', 'Followup', 'Assigned', 'Pending_Approval', 'Closed', 'Qualified', 'Potential_Qualified', 'LOB') NOT NULL,
    `changed_by` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_status_history_lead_id_idx`(`lead_id`),
    INDEX `lead_status_history_new_status_idx`(`new_status`),
    INDEX `lead_status_history_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `lead_status_history_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_assignment_history` (
    `id` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NOT NULL,
    `old_user_id` VARCHAR(191) NULL,
    `new_user_id` VARCHAR(191) NULL,
    `changed_by` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_assignment_history_lead_id_idx`(`lead_id`),
    INDEX `lead_assignment_history_old_user_id_idx`(`old_user_id`),
    INDEX `lead_assignment_history_new_user_id_idx`(`new_user_id`),
    INDEX `lead_assignment_history_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `lead_assignment_history_changed_at_idx`(`changed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_status_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NOT NULL,
    `current_status` ENUM('New', 'Followup', 'Assigned', 'Pending_Approval', 'Closed', 'Qualified', 'Potential_Qualified', 'LOB') NOT NULL,
    `requested_status` ENUM('New', 'Followup', 'Assigned', 'Pending_Approval', 'Closed', 'Qualified', 'Potential_Qualified', 'LOB') NOT NULL,
    `requested_by` VARCHAR(191) NOT NULL,
    `supervisor_id` VARCHAR(191) NOT NULL,
    `approval_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `approval_reason` VARCHAR(191) NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_status_approvals_lead_id_idx`(`lead_id`),
    INDEX `lead_status_approvals_supervisor_id_idx`(`supervisor_id`),
    INDEX `lead_status_approvals_requested_by_idx`(`requested_by`),
    INDEX `lead_status_approvals_approval_status_idx`(`approval_status`),
    INDEX `lead_status_approvals_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `lead_status_approvals_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registrations` (
    `id` VARCHAR(191) NOT NULL,
    `tracking_number` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `customer_type` VARCHAR(191) NULL,
    `document_type` VARCHAR(191) NULL,
    `document_issued_country` VARCHAR(191) NULL,
    `process_type` VARCHAR(191) NULL,
    `external_process` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NULL,
    `committed_duration` VARCHAR(191) NULL,
    `delivery_location` VARCHAR(191) NULL,
    `total_charges` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `advance_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `balance_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `balance_received_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `payment_mode` VARCHAR(191) NULL,
    `payment_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `payment_update_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `submitted_by` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NULL,
    `finance_approval_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `collected_person` VARCHAR(191) NULL,
    `commission_to_user_id` VARCHAR(191) NULL,
    `commission_to_name` VARCHAR(191) NULL,
    `commission_to_email` VARCHAR(191) NULL,
    `registered_person` VARCHAR(191) NULL,
    `region_of_registration` VARCHAR(191) NULL,
    `bm_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `accepted_by` VARCHAR(191) NULL,
    `accepted_at` DATETIME(3) NULL,
    `approval_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `tracking_status` VARCHAR(191) NOT NULL DEFAULT 'Registered',
    `welcome_call_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `welcome_called_by` VARCHAR(191) NULL,
    `welcome_called_at` DATETIME(3) NULL,
    `is_bm_locked` BOOLEAN NOT NULL DEFAULT false,
    `bm_lock_reason` VARCHAR(191) NULL,
    `bm_extension_status` VARCHAR(191) NOT NULL DEFAULT 'None',
    `bm_extension_requested_by` VARCHAR(191) NULL,
    `bm_extension_requested_at` DATETIME(3) NULL,
    `bm_extension_reason` VARCHAR(191) NULL,
    `bm_extension_approved_by` VARCHAR(191) NULL,
    `bm_extension_approved_at` DATETIME(3) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `registrations_tracking_number_key`(`tracking_number`),
    INDEX `registrations_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `registrations_created_at_idx`(`created_at`),
    INDEX `registrations_payment_status_idx`(`payment_status`),
    INDEX `registrations_payment_update_status_idx`(`payment_update_status`),
    INDEX `registrations_approval_status_idx`(`approval_status`),
    INDEX `registrations_finance_approval_status_idx`(`finance_approval_status`),
    INDEX `registrations_bm_status_idx`(`bm_status`),
    INDEX `registrations_welcome_call_status_idx`(`welcome_call_status`),
    INDEX `registrations_is_bm_locked_idx`(`is_bm_locked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_update` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_group_id` VARCHAR(191) NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `tracking_number` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `process_type` VARCHAR(191) NULL,
    `total_charges` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `advance_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `balance_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `payment_mode` VARCHAR(191) NOT NULL,
    `amount_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `invoice_number` VARCHAR(191) NOT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `receipt_file_url` VARCHAR(191) NULL,
    `receipt_file_name` VARCHAR(191) NULL,
    `receipt_mime_type` VARCHAR(191) NULL,
    `receipt_file_size` INTEGER NULL,
    `receipt_file_data` LONGBLOB NULL,
    `receipt_uploaded_at` DATETIME(3) NULL,
    `receipt_uploaded_by` VARCHAR(191) NULL,
    `submitted_by` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approval_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `reset_by` VARCHAR(191) NULL,
    `reset_at` DATETIME(3) NULL,
    `reset_reason` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,

    INDEX `payment_update_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `payment_update_invoice_group_id_idx`(`invoice_group_id`),
    INDEX `payment_update_tracking_number_idx`(`tracking_number`),
    INDEX `payment_update_invoice_number_idx`(`invoice_number`),
    INDEX `payment_update_approval_status_idx`(`approval_status`),
    INDEX `payment_update_submitted_at_idx`(`submitted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `payment_mode` VARCHAR(191) NOT NULL,
    `amount_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `payment_date` DATETIME(3) NOT NULL,
    `receipt_file_url` VARCHAR(191) NULL,
    `receipt_file_name` VARCHAR(191) NULL,
    `receipt_mime_type` VARCHAR(191) NULL,
    `receipt_file_size` INTEGER NULL,
    `receipt_file_data` LONGBLOB NULL,
    `receipt_uploaded_at` DATETIME(3) NULL,
    `receipt_uploaded_by` VARCHAR(191) NULL,
    `submitted_by` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approval_status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `reset_by` VARCHAR(191) NULL,
    `reset_at` DATETIME(3) NULL,
    `reset_reason` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,

    INDEX `payment_invoices_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `payment_invoices_invoice_number_idx`(`invoice_number`),
    INDEX `payment_invoices_approval_status_idx`(`approval_status`),
    INDEX `payment_invoices_submitted_at_idx`(`submitted_at`),
    UNIQUE INDEX `payment_invoices_owner_admin_id_invoice_number_key`(`owner_admin_id`, `invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `transaction_type` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `credit_or_debit` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NULL,
    `voucher_number` VARCHAR(191) NOT NULL,
    `bill_file_name` VARCHAR(191) NULL,
    `bill_mime_type` VARCHAR(191) NULL,
    `bill_file_size` INTEGER NULL,
    `bill_file_data` LONGBLOB NULL,
    `created_by` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `account_transactions_voucher_number_key`(`voucher_number`),
    INDEX `account_transactions_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `account_transactions_credit_or_debit_idx`(`credit_or_debit`),
    INDEX `account_transactions_category_idx`(`category`),
    INDEX `account_transactions_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_statement_entries` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `tracking_number` VARCHAR(191) NULL,
    `invoice_number` VARCHAR(191) NULL,
    `voucher_number` VARCHAR(191) NULL,
    `particulars` VARCHAR(191) NOT NULL,
    `entry_type` VARCHAR(191) NOT NULL,
    `credit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `debit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `running_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `source_type` VARCHAR(191) NOT NULL,
    `source_id` VARCHAR(191) NULL,
    `payment_update_id` VARCHAR(191) NULL,
    `account_transaction_id` VARCHAR(191) NULL,
    `registration_id` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reversed_at` DATETIME(3) NULL,
    `reversed_by` VARCHAR(191) NULL,
    `reversal_reason` VARCHAR(191) NULL,

    INDEX `account_statement_entries_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `account_statement_entries_date_idx`(`date`),
    INDEX `account_statement_entries_tracking_number_idx`(`tracking_number`),
    INDEX `account_statement_entries_invoice_number_idx`(`invoice_number`),
    INDEX `account_statement_entries_voucher_number_idx`(`voucher_number`),
    INDEX `account_statement_entries_source_type_source_id_idx`(`source_type`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registration_files` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_data` LONGBLOB NOT NULL,
    `file_category` VARCHAR(191) NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `registration_files_registration_id_idx`(`registration_id`),
    INDEX `registration_files_file_category_idx`(`file_category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_trails` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `performed_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_trails_registration_id_idx`(`registration_id`),
    INDEX `audit_trails_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_owner_admin_id_key`(`name`, `owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_code_key`(`code`),
    INDEX `permissions_module_idx`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_roleId_idx`(`roleId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `leave_request_id` VARCHAR(191) NULL,
    `attendance_date` DATE NOT NULL,
    `checkin_time` DATETIME(3) NULL,
    `checkout_time` DATETIME(3) NULL,
    `working_hours` DECIMAL(5, 2) NULL,
    `status` ENUM('Present', 'Late', 'Absent', 'HalfDay', 'Leave') NOT NULL DEFAULT 'Present',
    `daily_summary` VARCHAR(191) NULL,
    `checkin_remarks` VARCHAR(191) NULL,
    `approval_status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attendance_records_user_id_idx`(`user_id`),
    INDEX `attendance_records_leave_request_id_idx`(`leave_request_id`),
    INDEX `attendance_records_attendance_date_idx`(`attendance_date`),
    INDEX `attendance_records_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `attendance_records_approval_status_idx`(`approval_status`),
    UNIQUE INDEX `attendance_records_user_id_attendance_date_key`(`user_id`, `attendance_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_settings` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `expected_checkin_time` VARCHAR(191) NOT NULL,
    `expected_checkout_time` VARCHAR(191) NOT NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendance_settings_user_id_key`(`user_id`),
    INDEX `attendance_settings_owner_admin_id_idx`(`owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_holidays` (
    `id` VARCHAR(191) NOT NULL,
    `holiday_date` DATE NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Approved',
    `owner_admin_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `salary_holidays_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `salary_holidays_holiday_date_idx`(`holiday_date`),
    INDEX `salary_holidays_status_idx`(`status`),
    UNIQUE INDEX `salary_holidays_holiday_date_owner_admin_id_key`(`holiday_date`, `owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_payrolls` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `payroll_month` INTEGER NOT NULL,
    `payroll_year` INTEGER NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `user_name_snapshot` VARCHAR(191) NOT NULL,
    `user_email_snapshot` VARCHAR(191) NOT NULL,
    `department_snapshot` VARCHAR(191) NOT NULL,
    `office_location_snapshot` VARCHAR(191) NOT NULL,
    `monthly_salary_snapshot` DECIMAL(12, 2) NOT NULL,
    `working_days` DECIMAL(5, 2) NOT NULL,
    `present_days` DECIMAL(5, 2) NOT NULL,
    `paid_leave_days` DECIMAL(5, 2) NOT NULL,
    `unpaid_leave_days` DECIMAL(5, 2) NOT NULL,
    `leave_days` DECIMAL(5, 2) NOT NULL,
    `lop_days` DECIMAL(5, 2) NOT NULL,
    `gross_salary` DECIMAL(12, 2) NOT NULL,
    `per_day_rate` DECIMAL(12, 2) NOT NULL,
    `earned_salary` DECIMAL(12, 2) NOT NULL,
    `lop_deduction` DECIMAL(12, 2) NOT NULL,
    `net_payable` DECIMAL(12, 2) NOT NULL,
    `payroll_status` ENUM('Draft', 'Generated', 'Approved', 'Paid') NOT NULL DEFAULT 'Draft',
    `generated_by` VARCHAR(191) NULL,
    `generated_at` DATETIME(3) NULL,
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `paid_by` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `salary_payrolls_user_id_idx`(`user_id`),
    INDEX `salary_payrolls_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `salary_payrolls_payroll_month_payroll_year_idx`(`payroll_month`, `payroll_year`),
    INDEX `salary_payrolls_payroll_status_idx`(`payroll_status`),
    UNIQUE INDEX `salary_payrolls_user_id_payroll_month_payroll_year_owner_adm_key`(`user_id`, `payroll_month`, `payroll_year`, `owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `leave_type` VARCHAR(191) NOT NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NOT NULL,
    `total_days` DECIMAL(5, 2) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `attachment_url` VARCHAR(191) NULL,
    `status` ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `approval_note` VARCHAR(191) NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `rejected_by` VARCHAR(191) NULL,
    `rejected_at` DATETIME(3) NULL,
    `cancelled_by` VARCHAR(191) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `applied_by` VARCHAR(191) NULL,
    `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modified_by` VARCHAR(191) NULL,
    `modified_at` DATETIME(3) NOT NULL,
    `owner_admin_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_requests_user_id_idx`(`user_id`),
    INDEX `leave_requests_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `leave_requests_status_idx`(`status`),
    INDEX `leave_requests_from_date_idx`(`from_date`),
    INDEX `leave_requests_to_date_idx`(`to_date`),
    INDEX `leave_requests_applied_at_idx`(`applied_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_types` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `process_types_owner_admin_id_idx`(`owner_admin_id`),
    UNIQUE INDEX `process_types_name_owner_admin_id_key`(`name`, `owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `tracking_number` VARCHAR(191) NOT NULL,
    `process_type` VARCHAR(191) NOT NULL,
    `current_location` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `assigned_user_id` VARCHAR(191) NULL,
    `received_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sent_date` DATETIME(3) NULL,
    `completed_date` DATETIME(3) NULL,
    `rejected_date` DATETIME(3) NULL,
    `days_held` INTEGER NOT NULL DEFAULT 0,
    `remarks` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `process_assignments_tracking_number_idx`(`tracking_number`),
    INDEX `process_assignments_owner_admin_id_idx`(`owner_admin_id`),
    INDEX `process_assignments_current_location_idx`(`current_location`),
    INDEX `process_assignments_status_idx`(`status`),
    UNIQUE INDEX `process_assignments_registration_id_process_type_key`(`registration_id`, `process_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_movements` (
    `id` VARCHAR(191) NOT NULL,
    `process_assignment_id` VARCHAR(191) NOT NULL,
    `from_location` VARCHAR(191) NOT NULL,
    `to_location` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `process_movements_process_assignment_id_idx`(`process_assignment_id`),
    INDEX `process_movements_owner_admin_id_idx`(`owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_history` (
    `id` VARCHAR(191) NOT NULL,
    `process_assignment_id` VARCHAR(191) NOT NULL,
    `from_module` VARCHAR(191) NOT NULL,
    `to_module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `owner_admin_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `process_history_process_assignment_id_idx`(`process_assignment_id`),
    INDEX `process_history_owner_admin_id_idx`(`owner_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_owner_admin_id_fkey` FOREIGN KEY (`owner_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_supervisor_user_id_fkey` FOREIGN KEY (`supervisor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_office_location_id_fkey` FOREIGN KEY (`office_location_id`) REFERENCES `office_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_followup_history` ADD CONSTRAINT `lead_followup_history_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_status_history` ADD CONSTRAINT `lead_status_history_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_assignment_history` ADD CONSTRAINT `lead_assignment_history_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_status_approvals` ADD CONSTRAINT `lead_status_approvals_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_update` ADD CONSTRAINT `payment_update_invoice_group_id_fkey` FOREIGN KEY (`invoice_group_id`) REFERENCES `payment_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_update` ADD CONSTRAINT `payment_update_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_statement_entries` ADD CONSTRAINT `account_statement_entries_payment_update_id_fkey` FOREIGN KEY (`payment_update_id`) REFERENCES `payment_update`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_statement_entries` ADD CONSTRAINT `account_statement_entries_account_transaction_id_fkey` FOREIGN KEY (`account_transaction_id`) REFERENCES `account_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_statement_entries` ADD CONSTRAINT `account_statement_entries_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registration_files` ADD CONSTRAINT `registration_files_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_trails` ADD CONSTRAINT `audit_trails_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_leave_request_id_fkey` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_settings` ADD CONSTRAINT `attendance_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salary_payrolls` ADD CONSTRAINT `salary_payrolls_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_assignments` ADD CONSTRAINT `process_assignments_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_movements` ADD CONSTRAINT `process_movements_process_assignment_id_fkey` FOREIGN KEY (`process_assignment_id`) REFERENCES `process_assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_history` ADD CONSTRAINT `process_history_process_assignment_id_fkey` FOREIGN KEY (`process_assignment_id`) REFERENCES `process_assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
