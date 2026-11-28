import { and, eq, isNull } from "drizzle-orm";
import { createDb } from "../src/db/index.ts";
import { stories } from "../src/db/schema.ts";
import { sliceStoryTranscript } from "../src/ingestion/stories.ts";
import { getTranscript } from "../src/ingestion/supadata.ts";

const supadataApiKey = process.env.SUPADATA_API_KEY;
if (!supadataApiKey) {
  console.error("Falta SUPADATA_API_KEY en .env.local");
  process.exit(1);
}

const db = createDb(
  process.env.TURSO_DATABASE_URL ?? "file:.datos/local.db",
  process.env.TURSO_AUTH_TOKEN,
);

try {
  const pending = await db.query.episodes.findMany({
    columns: { videoId: true, number: true },
    where: { stories: { transcript: { isNull: true } } },
    with: {
      stories: {
        columns: { id: true, type: true, startSeconds: true, endSeconds: true },
        where: { transcript: { isNull: true } },
      },
    },
    orderBy: { number: "asc" },
  });

  for (const episode of pending) {
    try {
      const segments = await getTranscript(supadataApiKey, episode.videoId);
      const updated = await db.transaction(async (tx) => {
        let count = 0;
        for (const story of episode.stories) {
          // Si cambió el tramo mientras se bajaba la transcripción, queda para la próxima pasada.
          const result = await tx
            .update(stories)
            .set({ transcript: sliceStoryTranscript(segments, story) })
            .where(
              and(
                eq(stories.id, story.id),
                eq(stories.episodeVideoId, episode.videoId),
                eq(stories.type, story.type),
                eq(stories.startSeconds, story.startSeconds),
                eq(stories.endSeconds, story.endSeconds),
                isNull(stories.transcript),
              ),
            );
          count += result.rowsAffected;
        }
        return count;
      });
      console.log(`Episodio #${episode.number}: ${updated} Historias con transcripción guardada.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Episodio #${episode.number}: ${message}`);
      process.exitCode = 1;
    }
  }
} finally {
  db.$client.close();
}
