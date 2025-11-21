-- AlterTable
ALTER TABLE `payments` ADD COLUMN `idempotencyKey` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payments_idempotencyKey_key` ON `payments`(`idempotencyKey`);

-- CreateIndex
CREATE INDEX `payments_idempotencyKey_idx` ON `payments`(`idempotencyKey`);
