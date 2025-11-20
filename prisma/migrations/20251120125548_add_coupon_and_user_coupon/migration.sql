-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `discountType` VARCHAR(191) NOT NULL,
    `discountValue` DECIMAL(10, 2) NOT NULL,
    `minAmount` DECIMAL(10, 2) NULL,
    `totalQuantity` INTEGER NOT NULL,
    `issuedQuantity` INTEGER NOT NULL DEFAULT 0,
    `validFrom` DATETIME(3) NOT NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `coupons_validFrom_validUntil_idx`(`validFrom`, `validUntil`),
    INDEX `coupons_issuedQuantity_idx`(`issuedQuantity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_coupons` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `usedAt` DATETIME(3) NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `user_coupons_userId_idx`(`userId`),
    INDEX `user_coupons_couponId_idx`(`couponId`),
    INDEX `user_coupons_isUsed_idx`(`isUsed`),
    UNIQUE INDEX `user_coupons_userId_couponId_key`(`userId`, `couponId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_coupons` ADD CONSTRAINT `user_coupons_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
