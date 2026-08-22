CREATE TABLE `activityEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventType` varchar(96) NOT NULL,
  `description` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `activityEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `galleryImages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `originalKey` varchar(512) NOT NULL,
  `originalUrl` text NOT NULL,
  `thumbnailUrl` text,
  `filename` varchar(255) NOT NULL,
  `mimeType` varchar(100) NOT NULL,
  `fileSize` int NOT NULL,
  `width` int,
  `height` int,
  `caption` text,
  `smartGroup` enum('personal','screens','projects') NOT NULL DEFAULT 'personal',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `galleryImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `albums` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slug` varchar(160) NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text,
  `coverImageId` int,
  `visibility` enum('public','private') NOT NULL DEFAULT 'public',
  `presentationMode` enum('standard','immersive','kiosk') NOT NULL DEFAULT 'immersive',
  `accent` varchar(24) NOT NULL DEFAULT 'stone',
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `albums_id` PRIMARY KEY(`id`),
  CONSTRAINT `albums_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `albumImages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `albumId` int NOT NULL,
  `imageId` int NOT NULL,
  `source` enum('manual','auto') NOT NULL DEFAULT 'manual',
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `albumImages_id` PRIMARY KEY(`id`),
  CONSTRAINT `albumImages_album_image_unique` UNIQUE(`albumId`,`imageId`)
);
--> statement-breakpoint
CREATE TABLE `slideshowSettings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `autoplay` boolean NOT NULL DEFAULT true,
  `loop` boolean NOT NULL DEFAULT true,
  `intervalSeconds` int NOT NULL DEFAULT 5,
  `transition` enum('fade','crossfade','slide','instant') NOT NULL DEFAULT 'crossfade',
  `transitionSpeed` int NOT NULL DEFAULT 400,
  `background` varchar(24) NOT NULL DEFAULT 'near-black',
  `imageFit` enum('contain','cover') NOT NULL DEFAULT 'contain',
  `showControls` boolean NOT NULL DEFAULT true,
  `showCounter` boolean NOT NULL DEFAULT true,
  `showCaptions` boolean NOT NULL DEFAULT true,
  `swipeEnabled` boolean NOT NULL DEFAULT true,
  `keyboardEnabled` boolean NOT NULL DEFAULT true,
  `tapNavigationEnabled` boolean NOT NULL DEFAULT true,
  `defaultMode` enum('standard','immersive','kiosk') NOT NULL DEFAULT 'immersive',
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `slideshowSettings_id` PRIMARY KEY(`id`)
);
