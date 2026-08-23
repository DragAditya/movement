CREATE TABLE `aiSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`autoAnalyzeNew` boolean NOT NULL DEFAULT true,
	`model` enum('gemini-3-flash-preview','gemini-3.1-pro-preview') NOT NULL DEFAULT 'gemini-3-flash-preview',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiStatus` enum('off','queued','analyzing','ready','approved','dismissed','failed') DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiName` varchar(120);--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiDescription` varchar(160);--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiSuggestedAlbumId` int;--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiSuggestedNewAlbum` varchar(80);--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiModel` varchar(80);--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiError` varchar(255);--> statement-breakpoint
ALTER TABLE `galleryImages` ADD `aiAnalyzedAt` timestamp;