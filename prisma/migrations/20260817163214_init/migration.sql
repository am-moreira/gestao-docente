-- CreateTable
CREATE TABLE `schoolCalendarItems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(160) NOT NULL,
    `eventDate` DATE NOT NULL,
    `type` ENUM('holiday', 'event') NOT NULL,
    `description` VARCHAR(600) NULL,
    `segmentId` INTEGER NULL,
    `createdByUserId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `schoolCalendarItems_eventDate_idx`(`eventDate`),
    INDEX `schoolCalendarItems_segmentId_idx`(`segmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schoolCalendarItems` ADD CONSTRAINT `schoolCalendarItems_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `segments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schoolCalendarItems` ADD CONSTRAINT `schoolCalendarItems_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
