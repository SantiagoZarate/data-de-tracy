import { and, eq, gt, sql } from "drizzle-orm";
import type { ProcessingResult } from "../ingestion/process-episode.ts";
import type { Story } from "../ingestion/stories.ts";
import type { Db } from "./index.ts";
import { episodes, stories, storyThemes } from "./schema.ts";

export type ProcessedEpisode = Extract<ProcessingResult, { status: "processed" }>;

/**
 * Guarda un Episodio procesado y sus Historias. Es idempotente: el Episodio se
 * identifica por el ID del video, y cada Historia por su Episodio y su posición.
 * Guardar de nuevo actualiza las filas (las Historias conservan su `id`) y borra
 * las que sobran si ahora hay menos. Un Episodio sin Historias se guarda igual.
 * Las Correcciones manuales se conservan; si una Historia corregida se movió
 * o no se puede reconocer, no se guarda ningún cambio en el Episodio.
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

    const savedStories = await tx.query.stories.findMany({
      where: { episodeVideoId: episode.videoId },
    });
    const savedByPosition = new Map(savedStories.map((story) => [story.position, story]));

    for (const saved of savedStories) {
      if (
        !saved.titleCorrected &&
        !saved.summaryCorrected &&
        !saved.storyCountryCorrected &&
        !saved.senderCountryCorrected &&
        !saved.themesCorrected
      ) {
        continue;
      }

      // La posición sola no alcanza: un Bonus Track omitido puede desplazar al siguiente.
      const [match, anotherMatch] = episode.stories.filter((story) => matchesStory(saved, story));
      if (
        !match ||
        anotherMatch ||
        match !== episode.stories[saved.position - 1] ||
        savedStories.some((other) => other.id !== saved.id && matchesStory(other, match))
      ) {
        throw new Error(
          `No se pudo reconocer en su posición la Historia ${saved.position} con Correcciones manuales del Episodio #${episode.number}. Requiere revisión manual.`,
        );
      }
    }

    for (const [i, story] of episode.stories.entries()) {
      const position = i + 1;
      const saved = savedByPosition.get(position);
      const {
        type,
        startSeconds,
        endSeconds,
        title,
        summary,
        storyCountry,
        senderCountry,
        themes,
      } = story;
      const storySegment = { type, startSeconds, endSeconds };
      const [{ id }] = await tx
        .insert(stories)
        .values({
          episodeVideoId: episode.videoId,
          position,
          ...storySegment,
          title,
          summary,
          storyCountry,
          senderCountry,
        })
        .onConflictDoUpdate({
          target: [stories.episodeVideoId, stories.position],
          set: {
            ...storySegment,
            title: saved?.titleCorrected ? undefined : title,
            summary: saved?.summaryCorrected ? undefined : summary,
            storyCountry: saved?.storyCountryCorrected ? undefined : storyCountry,
            senderCountry: saved?.senderCountryCorrected ? undefined : senderCountry,
          },
        })
        .returning({ id: stories.id });

      if (saved?.themesCorrected) continue;
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

type StoryRange = Pick<Story, "type" | "startSeconds" | "endSeconds">;

function matchesStory(saved: StoryRange, incoming: StoryRange): boolean {
  if (saved.type !== incoming.type) return false;
  if (saved.startSeconds === incoming.startSeconds && saved.endSeconds === incoming.endSeconds) {
    return true;
  }

  const overlap =
    Math.min(saved.endSeconds, incoming.endSeconds) -
    Math.max(saved.startSeconds, incoming.startSeconds);
  const longest = Math.max(
    saved.endSeconds - saved.startSeconds,
    incoming.endSeconds - incoming.startSeconds,
  );
  return overlap > longest / 2;
}
