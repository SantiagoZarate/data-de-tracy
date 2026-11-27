import type { Db } from "./index.ts";

/** Todos los Episodios, del más nuevo al más viejo, con sus Historias en orden y sus Temáticas. */
export function listEpisodesWithStories(db: Db) {
  return db.query.episodes.findMany({
    orderBy: { number: "desc" },
    with: {
      stories: {
        orderBy: { position: "asc" },
        with: { themes: { columns: { theme: true } } },
      },
    },
  });
}

export type EpisodeWithStories = Awaited<ReturnType<typeof listEpisodesWithStories>>[number];
