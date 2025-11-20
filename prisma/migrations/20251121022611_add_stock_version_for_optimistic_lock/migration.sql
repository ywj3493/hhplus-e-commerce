-- AlterTable
-- Add version column for optimistic locking concurrency control
ALTER TABLE `stocks` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;
