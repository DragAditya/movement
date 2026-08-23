ALTER TABLE `galleryImages` ADD `contentHash` varchar(64);--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `visualHash` varchar(16);--> statement-breakpoint
ALTER TABLE `galleryImages` ADD CONSTRAINT `galleryImages_content_hash_unique` UNIQUE(`contentHash`);