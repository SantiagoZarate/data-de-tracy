// Uso: pnpm process-episode <videoId | URL de YouTube>
import { anthropic } from "@ai-sdk/anthropic";
import { createJevClassifier } from "../src/ingestion/jev.ts";
import { processEpisode } from "../src/ingestion/process-episode.ts";

function extractVideoId(input: string): string {
  if (/^[\w-]{11}$/.test(input)) return input;
  const url = new URL(input);
  const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
  if (!id) throw new Error(`No se pudo sacar el ID del video de "${input}"`);
  return id;
}

const input = process.argv[2];
if (!input) {
  console.error("Uso: pnpm process-episode <videoId | URL de YouTube>");
  process.exit(1);
}

const supadataApiKey = process.env.SUPADATA_API_KEY;
if (!supadataApiKey) throw new Error("Falta SUPADATA_API_KEY en .env.local");

const result = await processEpisode(extractVideoId(input), {
  supadataApiKey,
  model: anthropic("claude-haiku-5-5"),
  // Sin TYPESAFE_API_KEY, los títulos con formato desconocido van a revisión.
  isEpisode: process.env.TYPESAFE_API_KEY
    ? createJevClassifier(process.env.TYPESAFE_API_KEY)
    : undefined,
});

console.log(JSON.stringify(result, null, 2));
