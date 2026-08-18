CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`plan` mediumtext NOT NULL,
	`validation` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `schedule_owner_period_unique` UNIQUE(`userId`,`year`,`month`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`gender` enum('female','male','unspecified') NOT NULL DEFAULT 'unspecified',
	`active` boolean NOT NULL DEFAULT true,
	`competencies` text NOT NULL,
	`historicalTotal` int NOT NULL DEFAULT 0,
	`historicalMorning` int NOT NULL DEFAULT 0,
	`historicalEvening` int NOT NULL DEFAULT 0,
	`historicalNight` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_owner_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `unavailabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`staffId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`type` enum('leave','report') NOT NULL DEFAULT 'leave',
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unavailabilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `unavailability_unique` UNIQUE(`userId`,`staffId`,`date`)
);
