-- AlterTable
ALTER TABLE `payments` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN `refundedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `payments_status_idx` ON `payments`(`status`);
