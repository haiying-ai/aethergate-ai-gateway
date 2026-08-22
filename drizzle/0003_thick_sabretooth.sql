CREATE TABLE `member_entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`invitation_id` text NOT NULL,
	`request_limit` integer,
	`token_limit` integer,
	`starts_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portal_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_sessions_token_hash_unique` ON `portal_sessions` (`token_hash`);--> statement-breakpoint
ALTER TABLE `quota_policies` ADD `name` text DEFAULT '额度规则' NOT NULL;--> statement-breakpoint
ALTER TABLE `quota_policies` ADD `member_id` text;--> statement-breakpoint
ALTER TABLE `quota_policies` ADD `provider_id` text;--> statement-breakpoint
ALTER TABLE `quota_policies` ADD `window_seconds` integer DEFAULT 2592000 NOT NULL;--> statement-breakpoint
ALTER TABLE `quota_policies` ADD `request_limit` integer;--> statement-breakpoint
ALTER TABLE `quota_policies` ADD `token_limit` integer;