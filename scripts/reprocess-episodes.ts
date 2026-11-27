import { anthropic } from "@ai-sdk/anthropic";
import { createDb } from "../src/db/index.ts";
import { saveEpisode } from "../src/db/save-episode.ts";
import { processKnownEpisode } from "../src/ingestion/process-episode.ts";

const args = process.argv.slice(2);
if (
  args.length === 0 ||
  args.some((arg) => !/^\d+$/.test(arg) || !Number.isSafeInteger(Number(arg)))
) {
  console.error("Uso: pnpm reprocess-episodes <número de Episodio>...");
  process.exit(1);
}

const supadataApiKey = process.env.SUPADATA_API_KEY;
if (!supadataApiKey) {
  console.error("Falta SUPADATA_API_KEY en .env.local");
  process.exit(1);
}

const db = createDb(
  process.env.TURSO_DATABASE_URL ?? "file:.datos/local.db",
  process.env.TURSO_AUTH_TOKEN,
);
const deps = { supadataApiKey, model: anthropic("claude-haiku-5-5") };

try {
  for (const number of new Set(args.map(Number))) {
    try {
      const [episode, duplicate] = await db.query.episodes.findMany({
        columns: { videoId: true, number: true, title: true, needsTitleReview: true },
        where: { number },
        limit: 2,
      });
      if (!episode) throw new Error("No está guardado en la base.");
      if (duplicate)
        throw new Error("Hay más de un Episodio con ese número. Requiere revisión manual.");

      const result = await processKnownEpisode(episode, deps);
      await saveEpisode(db, result);
      console.log(`Episodio #${number} guardado con ${result.stories.length} Historias.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Episodio #${number}: ${message}`);
      process.exitCode = 1;
    }
  }
} finally {
  db.$client.close();
}
