CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`object_type` text NOT NULL,
	`object_id` text,
	`summary` text NOT NULL,
	`result` text DEFAULT 'success' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concurrency_leases` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`member_id` text,
	`member_api_key_id` text,
	`provider_id` text,
	`provider_credential_id` text,
	`public_model_id` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `concurrency_leases_request_id_unique` ON `concurrency_leases` (`request_id`);--> statement-breakpoint
CREATE TABLE `health_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text,
	`credential_id` text,
	`level` text NOT NULL,
	`event_type` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `member_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`secret_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`rpm_limit` integer,
	`tpm_limit` integer,
	`concurrency_limit` integer,
	`last_used_at` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_api_keys_secret_hash_unique` ON `member_api_keys` (`secret_hash`);--> statement-breakpoint
CREATE TABLE `member_model_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`public_model_id` text NOT NULL,
	`effect` text DEFAULT 'allow' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`note` text,
	`status` text DEFAULT 'active' NOT NULL,
	`monthly_budget` real,
	`monthly_token_limit` integer,
	`monthly_request_limit` integer,
	`rpm_limit` integer DEFAULT 60 NOT NULL,
	`tpm_limit` integer DEFAULT 100000 NOT NULL,
	`concurrency_limit` integer DEFAULT 2 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `model_price_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_model_id` text NOT NULL,
	`billing_kind` text DEFAULT 'metered' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`unit` text DEFAULT '1M_tokens' NOT NULL,
	`input_price` real,
	`output_price` real,
	`cache_input_price` real,
	`user_input_price` real,
	`user_output_price` real,
	`effective_at` text NOT NULL,
	`expires_at` text,
	`verified_at` text,
	`source_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `model_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`public_model_id` text NOT NULL,
	`provider_model_id` text NOT NULL,
	`priority` integer DEFAULT 10 NOT NULL,
	`weight` integer DEFAULT 100 NOT NULL,
	`allow_failover` integer DEFAULT false NOT NULL,
	`concurrency_limit` integer DEFAULT 10 NOT NULL,
	`status` text DEFAULT 'enabled' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`name` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`nonce` text NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`prefix` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 10 NOT NULL,
	`weight` integer DEFAULT 100 NOT NULL,
	`concurrency_limit` integer DEFAULT 4 NOT NULL,
	`rpm_limit` integer DEFAULT 60 NOT NULL,
	`tpm_limit` integer DEFAULT 100000 NOT NULL,
	`cooldown_until` text,
	`last_used_at` text,
	`last_success_at` text,
	`last_error` text,
	`deleted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_credentials_fingerprint_idx` ON `provider_credentials` (`provider_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `provider_models` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`upstream_model_id` text NOT NULL,
	`display_name` text NOT NULL,
	`supports_chat` integer DEFAULT true NOT NULL,
	`supports_responses` integer DEFAULT false NOT NULL,
	`supports_streaming` integer DEFAULT true NOT NULL,
	`supports_tools` integer DEFAULT false NOT NULL,
	`context_window` integer DEFAULT 128000 NOT NULL,
	`max_output_tokens` integer DEFAULT 8192 NOT NULL,
	`status` text DEFAULT 'enabled' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`protocol` text NOT NULL,
	`base_url` text NOT NULL,
	`chat_path` text DEFAULT '/chat/completions' NOT NULL,
	`responses_path` text DEFAULT '/responses' NOT NULL,
	`models_path` text DEFAULT '/models' NOT NULL,
	`auth_header` text DEFAULT 'Authorization' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`template_id` text,
	`platform` text NOT NULL,
	`protocol` text NOT NULL,
	`base_url` text NOT NULL,
	`chat_path` text NOT NULL,
	`responses_path` text,
	`models_path` text,
	`billing_type` text DEFAULT 'metered' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`concurrency_limit` integer DEFAULT 10 NOT NULL,
	`rpm_limit` integer DEFAULT 60 NOT NULL,
	`tpm_limit` integer DEFAULT 100000 NOT NULL,
	`timeout_ms` integer DEFAULT 120000 NOT NULL,
	`allow_fallback` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_models` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'enabled' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_models_name_unique` ON `public_models` (`name`);--> statement-breakpoint
CREATE TABLE `quota_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`monthly_budget` real,
	`rpm_limit` integer,
	`tpm_limit` integer,
	`concurrency_limit` integer,
	`max_input_tokens` integer,
	`max_output_tokens` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`member_id` text,
	`member_api_key_id` text,
	`provider_id` text,
	`provider_credential_id` text,
	`public_model` text NOT NULL,
	`upstream_model` text,
	`price_version_id` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cache_tokens` integer DEFAULT 0 NOT NULL,
	`cost_amount` real,
	`settlement_amount` real,
	`status` text NOT NULL,
	`http_status` integer,
	`upstream_request_id` text,
	`duration_ms` integer,
	`settled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usage_ledger_request_id_unique` ON `usage_ledger` (`request_id`);