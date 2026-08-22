CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`email` text,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`monthly_request_limit` integer,
	`monthly_token_limit` integer,
	`rpm_limit` integer DEFAULT 60 NOT NULL,
	`concurrency_limit` integer DEFAULT 2 NOT NULL,
	`expires_at` text NOT NULL,
	`redeemed_at` text,
	`member_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_code_unique` ON `invitations` (`code`);