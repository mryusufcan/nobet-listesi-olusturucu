CREATE TABLE `specialDays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`name` varchar(120) NOT NULL,
	`morningSlots` int NOT NULL,
	`eveningSlots` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `specialDays_id` PRIMARY KEY(`id`),
	CONSTRAINT `special_day_unique` UNIQUE(`userId`,`date`)
);
