import type { Db } from "./index.ts";
import { episodes, stories } from "./schema.ts";

export async function getCatalogCounts(db: Db) {
  const [storyCount, episodeCount] = await Promise.all([db.$count(stories), db.$count(episodes)]);
  return { storyCount, episodeCount };
}

export function listStoriesPage(db: Db, page: number, pageSize: number) {
  return db.query.stories.findMany({
    columns: {
      id: true,
      type: true,
      startSeconds: true,
      title: true,
      summary: true,
      storyCountry: true,
      senderCountry: true,
    },
    orderBy: { episode: { number: "desc" }, episodeVideoId: "asc", position: "asc" },
    with: {
      episode: { columns: { number: true, videoId: true } },
      themes: { columns: { theme: true } },
    },
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
}

export type CatalogStory = Awaited<ReturnType<typeof listStoriesPage>>[number];
