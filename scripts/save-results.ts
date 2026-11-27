// Uso: pnpm save-results <resultado.json>...
// Guarda en la base los resultados de `pnpm process-episode` (por ejemplo, .datos/muestra/*.json).
// Sin TURSO_DATABASE_URL usa la base local .datos/local.db (crearla antes con `pnpm db:migrate`).
import { readFile } from "node:fs/promises";
import { createDb } from "../src/db/index.ts";
import { saveEpisode } from "../src/db/save-episode.ts";
import type { ProcessingResult } from "../src/ingestion/process-episode.ts";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Uso: pnpm save-results <resultado.json>...");
  process.exit(1);
}

const db = createDb(
  process.env.TURSO_DATABASE_URL ?? "file:.datos/local.db",
  process.env.TURSO_AUTH_TOKEN,
);

let failed = 0;
for (const file of files) {
  let result: ProcessingResult;
  try {
    result = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    // Un procesamiento que falló deja el .json vacío (el error queda en el .err).
    console.error(`${file}: no se pudo leer, se saltea (${(error as Error).message})`);
    failed++;
    continue;
  }
  if (result.status !== "processed") {
    console.log(`${file}: ${result.status}, no se guarda (${result.reason})`);
    continue;
  }
  await saveEpisode(db, result);
  console.log(
    `${file}: Episodio #${result.number} guardado con ${result.stories.length} Historias`,
  );
}

db.$client.close();
if (failed > 0) process.exitCode = 1;
