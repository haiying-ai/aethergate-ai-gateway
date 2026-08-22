ALTER TABLE `provider_models` ADD `supports_vision` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `provider_models`
SET `supports_vision` = true
WHERE lower(`upstream_model_id`) = 'deepseek-v4-flash'
  AND `provider_id` IN (
    SELECT `id` FROM `providers`
    WHERE lower(`base_url`) LIKE '%/api/plan%'
      AND lower(`base_url`) NOT LIKE '%/api/coding%'
  );
