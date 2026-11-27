import { and, eq, gt, sql } from "drizzle-orm";
import type { ProcessingResult } from "../ingestion/process-episode.ts";
import type { Db } from "./index.ts";
import { episodes, stories, storyThemes } from "./schema.ts";

export type ProcessedEpisode = Extract<ProcessingResult, { status: "processed" }>;

/**
 * Guarda un Episodio procesado y sus Historias. Es idempotente: el Episodio se
 * identifica por el ID del video, y cada Historia por su Episodio y su posición.
 * Guardar de nuevo actualiza las filas (las Historias conservan su `id`) y borra
 * las que sobran si ahora hay menos. Un Episodio sin Historias se guarda igual.
 */
export async function saveEpisode(db: Db, episode: ProcessedEpisode): Promise<void> {
  await db.transaction(async (tx) => {
    const episodeData = {
      number: episode.number,
      title: episode.title,
      needsTitleReview: episode.needsTitleReview,
      processedAt: sql`(unixepoch())`,
    };
    await tx
      .insert(episodes)
      .values({ videoId: episode.videoId, ...episodeData })
      .onConflictDoUpdate({ target: episodes.videoId, set: episodeData });

    for (const [i, story] of episode.stories.entries()) {
      const { themes, ...storyData } = story;
      const [{ id }] = await tx
        .insert(stories)
        .values({ episodeVideoId: episode.videoId, position: i + 1, ...storyData })
        .onConflictDoUpdate({
          target: [stories.episodeVideoId, stories.position],
          set: storyData,
        })
        .returning({ id: stories.id });

      await tx.delete(storyThemes).where(eq(storyThemes.storyId, id));
      // Sin duplicados: el LLM podría repetir una Temática.
      const uniqueThemes = [...new Set(themes)];
      if (uniqueThemes.length > 0) {
        await tx.insert(storyThemes).values(uniqueThemes.map((theme) => ({ storyId: id, theme })));
      }
    }

    await tx
      .delete(stories)
      .where(
        and(
          eq(stories.episodeVideoId, episode.videoId),
          gt(stories.position, episode.stories.length),
        ),
      );
  });
}
