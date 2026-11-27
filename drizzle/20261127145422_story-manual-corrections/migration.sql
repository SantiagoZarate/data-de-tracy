ALTER TABLE `stories` ADD `title_corrected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `summary_corrected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `story_country_corrected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `sender_country_corrected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `themes_corrected` integer DEFAULT false NOT NULL;