ALTER TABLE `aiSettings` MODIFY COLUMN `autoAnalyzeNew` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `aiSettings` MODIFY COLUMN `model` enum('gemini-3-flash-preview','gemini-3.1-pro-preview','gemini-3.1-flash-lite','gemini-3.5-flash-lite') NOT NULL DEFAULT 'gemini-3-flash-preview';--> statement-breakpoint
ALTER TABLE `aiSettings` ADD `provider` enum('builtin','personal') DEFAULT 'builtin' NOT NULL;--> statement-breakpoint
ALTER TABLE `aiSettings` ADD `batchSize` int DEFAULT 8 NOT NULL;