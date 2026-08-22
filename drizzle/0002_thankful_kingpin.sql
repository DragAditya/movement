ALTER TABLE `albums` ADD `kind` enum('system','custom') DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE `albumImages` ADD CONSTRAINT `albumImages_image_unique` UNIQUE(`imageId`);