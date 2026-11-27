import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { STORY_TYPES, THEMES } from "../ingestion/stories.ts";

/** Lista SQL de literales para un CHECK ... IN (...). Los valores son constantes del código, no input. */
const sqlList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${v.replaceAll("'", "''")}'`).join(", "));

/**
 * Un Episodio procesado, identificado por el ID del video de YouTube.
 * Se guarda aunque no tenga Historias, para no volver a procesarlo.
 */
export const episodes = sqliteTable(
  "episodes",
  {
    videoId: text("video_id").primaryKey(),
    number: integer("number").notNull(),
    /** Tal cual sale del título publicado, sin el número. */
    title: text("title").notNull(),
    /** El título no tenía formato conocido: revisar número y título a mano. */
    needsTitleReview: integer("needs_title_review", { mode: "boolean" }).notNull().default(false),
    processedAt: integer("processed_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("episodes_number_idx").on(t.number)],
);

/** Una Historia: un relato de un oyente, leído al aire. Pertenece a un único Episodio. */
export const stories = sqliteTable(
  "stories",
  {
    id: integer("id").primaryKey(),
    episodeVideoId: text("episode_video_id")
      .notNull()
      .references(() => episodes.videoId, { onDelete: "cascade" }),
    /** Posición dentro del Episodio, desde 1. Junto con el Episodio identifica a la Historia al re-procesar. */
    position: integer("position").notNull(),
    type: text("type", { enum: STORY_TYPES }).notNull(),
    startSeconds: integer("start_seconds").notNull(),
    endSeconds: integer("end_seconds").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    /** Código ISO 3166-1 alfa-2 de dónde ocurre la Historia; null si no se menciona. */
    storyCountry: text("story_country"),
    /** Código ISO 3166-1 alfa-2 de dónde es quien la envió; null si no se menciona. */
    senderCountry: text("sender_country"),
  },
  (t) => [
    unique("stories_episode_position_unq").on(t.episodeVideoId, t.position),
    index("stories_story_country_idx").on(t.storyCountry),
    index("stories_sender_country_idx").on(t.senderCountry),
    check("stories_type_chk", sql`${t.type} in (${sqlList(STORY_TYPES)})`),
    check("stories_position_chk", sql`${t.position} >= 1`),
    check(
      "stories_seconds_chk",
      sql`${t.startSeconds} >= 0 and ${t.endSeconds} >= ${t.startSeconds}`,
    ),
  ],
);

/** Las Temáticas de cada Historia (entre 1 y 3, de la lista fija). */
export const storyThemes = sqliteTable(
  "story_themes",
  {
    storyId: integer("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    theme: text("theme", { enum: THEMES }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.storyId, t.theme] }),
    index("story_themes_theme_idx").on(t.theme),
    check("story_themes_theme_chk", sql`${t.theme} in (${sqlList(THEMES)})`),
  ],
);
