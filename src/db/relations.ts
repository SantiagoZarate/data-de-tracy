import { defineRelations } from "drizzle-orm";
import * as schema from "./schema.ts";

export const relations = defineRelations(schema, (r) => ({
  episodes: {
    stories: r.many.stories(),
  },
  stories: {
    episode: r.one.episodes({
      from: r.stories.episodeVideoId,
      to: r.episodes.videoId,
      optional: false,
    }),
    themes: r.many.storyThemes(),
  },
  storyThemes: {
    story: r.one.stories({
      from: r.storyThemes.storyId,
      to: r.stories.id,
      optional: false,
    }),
  },
}));
