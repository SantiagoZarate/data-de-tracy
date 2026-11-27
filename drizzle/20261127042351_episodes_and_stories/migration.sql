CREATE TABLE `episodes` (
	`video_id` text PRIMARY KEY,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`needs_title_review` integer DEFAULT false NOT NULL,
	`processed_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `story_themes` (
	`story_id` integer NOT NULL,
	`theme` text NOT NULL,
	CONSTRAINT `story_themes_pk` PRIMARY KEY(`story_id`, `theme`),
	CONSTRAINT `fk_story_themes_story_id_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE,
	CONSTRAINT "story_themes_theme_chk" CHECK("theme" in ('Terror', 'Paranormal', 'Amor', 'Desamor', 'Familia', 'Amistad', 'Bizarro', 'Humor', 'Crimen', 'Trabajo', 'Viajes', 'Escuela', 'Famosos', 'Drogas', 'Triste', 'Polémica', 'Inmoral'))
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` integer PRIMARY KEY,
	`episode_video_id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`start_seconds` integer NOT NULL,
	`end_seconds` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`story_country` text,
	`sender_country` text,
	CONSTRAINT `fk_stories_episode_video_id_episodes_video_id_fk` FOREIGN KEY (`episode_video_id`) REFERENCES `episodes`(`video_id`) ON DELETE CASCADE,
	CONSTRAINT `stories_episode_position_unq` UNIQUE(`episode_video_id`,`position`),
	CONSTRAINT "stories_type_chk" CHECK("type" in ('principal', 'bonus')),
	CONSTRAINT "stories_position_chk" CHECK("position" >= 1),
	CONSTRAINT "stories_seconds_chk" CHECK("start_seconds" >= 0 and "end_seconds" >= "start_seconds")
);
--> statement-breakpoint
CREATE INDEX `episodes_number_idx` ON `episodes` (`number`);--> statement-breakpoint
CREATE INDEX `story_themes_theme_idx` ON `story_themes` (`theme`);--> statement-breakpoint
CREATE INDEX `stories_story_country_idx` ON `stories` (`story_country`);--> statement-breakpoint
CREATE INDEX `stories_sender_country_idx` ON `stories` (`sender_country`);