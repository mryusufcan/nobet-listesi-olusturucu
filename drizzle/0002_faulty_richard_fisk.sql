CREATE TABLE `staffConstraints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`staffId` int NOT NULL,
	`rule` enum('only_shift','blocked_shift','blocked_weekday','blocked_device','weekly_max') NOT NULL,
	`value` varchar(80) NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staffConstraints_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_constraint_unique` UNIQUE(`userId`,`staffId`,`rule`,`value`)
);
