CREATE TABLE `duplicateReviewCandidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('pending','processing','kept','uploaded','replaced') NOT NULL DEFAULT 'pending',
	`matchKind` enum('exact','similar') NOT NULL,
	`matchedImageId` int NOT NULL,
	`distance` int NOT NULL,
	`similarity` int NOT NULL,
	`originalKey` varchar(512) NOT NULL,
	`originalUrl` text NOT NULL,
	`thumbnailUrl` text,
	`previewUrl` text,
	`filename` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`visualHash` varchar(16) NOT NULL,
	`width` int,
	`height` int,
	`decision` enum('keep','upload_as_new','replace_existing'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `duplicateReviewCandidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `duplicateReviewCandidates_pending_created_idx` ON `duplicateReviewCandidates` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `duplicateReviewCandidates_match_idx` ON `duplicateReviewCandidates` (`matchKind`,`matchedImageId`,`status`);