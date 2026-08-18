CREATE TABLE `scheduleVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduleId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`plan` mediumtext NOT NULL,
	`validation` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduleVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `schedule_version_period_index` ON `scheduleVersions` (`userId`,`year`,`month`);