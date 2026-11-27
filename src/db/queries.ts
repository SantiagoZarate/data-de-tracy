import type { Db } from "./index.ts";
import { episodes, stories } from "./schema.ts";

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

export async function getCatalogCounts(db: Db) {
  const [storyCount, episodeCount] = await Promise.all([db.$count(stories), db.$count(episodes)]);
  return { storyCount, episodeCount };
}

export function listStoriesPage(db: Db, page: number, pageSize: number) {
  return db.query.stories.findMany({
    ...publicStoryFields,
    orderBy: { episode: { number: "desc" }, episodeVideoId: "asc", position: "asc" },
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
