import {
  and,
  count,
  countDistinct,
  EmptyFilter,
  eq,
  exists,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { MAX_STORY_QUERY_LENGTH, type StoryFilters, type StorySort } from "../story-metadata.ts";
import type { Db } from "./index.ts";
import { episodes, stories, storyThemes } from "./schema.ts";

const publicStoryFields = {
  columns: {
    id: true,
    type: true,
    startSeconds: true,
    title: true,
    summary: true,
    storyCountry: true,
    senderCountry: true,
  },
  with: {
    episode: { columns: { number: true, videoId: true } },
    themes: { columns: { theme: true } },
  },
} as const;

function storySearchWhere(story: typeof stories, query: string | undefined) {
  const text = query?.trim().slice(0, MAX_STORY_QUERY_LENGTH);
  if (!text) return;

  const words = text.normalize("NFC").match(/[\p{L}\p{N}]+/gu);
  if (!words) return sql`0`;

  const match = words.map((word) => `"${word}"*`).join(" AND ");
  return inArray(story.id, sql`(select rowid from stories_fts where stories_fts match ${match})`);
}

function storyFilterWhere(
  db: Db,
  story: typeof stories,
  { query, country, themes, type }: StoryFilters,
) {
  return and(
    storySearchWhere(story, query),
    country ? eq(story.storyCountry, country) : undefined,
    type ? eq(story.type, type) : undefined,
    themes?.length
      ? exists(
          db
            .select({ storyId: storyThemes.storyId })
            .from(storyThemes)
            .where(and(eq(storyThemes.storyId, story.id), inArray(storyThemes.theme, themes))),
        )
      : undefined,
  );
}

export async function getCatalogCounts(db: Db, filters: StoryFilters = {}) {
  const where = storyFilterWhere(db, stories, filters);
  if (where) {
    const [counts] = await db
      .select({ storyCount: count(), episodeCount: countDistinct(stories.episodeVideoId) })
      .from(stories)
      .where(where);
    return counts;
  }

  const [storyCount, episodeCount] = await Promise.all([db.$count(stories), db.$count(episodes)]);
  return { storyCount, episodeCount };
}

export async function listStoryCountries(db: Db) {
  const rows = await db
    .selectDistinct({ country: stories.storyCountry })
    .from(stories)
    .where(isNotNull(stories.storyCountry));
  return rows
    .map(({ country }) => country)
    .filter((country): country is string => country !== null && /^[A-Z]{2}$/.test(country));
}

export function listStoriesPage(
  db: Db,
  page: number,
  pageSize: number,
  filters: StoryFilters = {},
  sort: StorySort = "recientes",
) {
  return db.query.stories.findMany({
    ...publicStoryFields,
    where: { RAW: (story) => storyFilterWhere(db, story, filters) ?? EmptyFilter },
    orderBy: {
      episode: { number: sort === "antiguas" ? "asc" : "desc" },
      episodeVideoId: "asc",
      position: "asc",
    },
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
}

export function getStoryById(db: Db, id: number) {
  return db.query.stories.findFirst({
    ...publicStoryFields,
    where: { id },
  });
}

export type CatalogStory = Awaited<ReturnType<typeof listStoriesPage>>[number];

export function listStoriesWithSharedThemes(db: Db, story: CatalogStory) {
  const themes = story.themes.map(({ theme }) => theme);
  if (themes.length === 0) return [];

  return db.query.stories.findMany({
    columns: { id: true, title: true, type: true },
    with: { episode: { columns: { number: true, videoId: true } } },
    where: { id: { ne: story.id }, themes: { theme: { in: themes } } },
    orderBy: { episode: { number: "desc" }, episodeVideoId: "asc", position: "asc" },
    limit: 6,
  });
}
