// Uso: node --env-file=.env.local scripts/download-transcript.ts <videoId>
// Guarda título + transcripción con timestamps en .datos/ (gitignored: el repo es público, ver ADR 0001).
import { writeFile } from "node:fs/promises";
import { getTranscript, getVideoTitle } from "../src/ingestion/supadata.ts";

const videoId = process.argv[2];
const apiKey = process.env.SUPADATA_API_KEY!;
const title = await getVideoTitle(apiKey, videoId);
const segments = await getTranscript(apiKey, videoId);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const text = [title, "", ...segments.map((s) => `[${fmt(s.startSeconds)}] ${s.text}`)].join("\n");
await writeFile(`.datos/${videoId}.txt`, text);
console.log(title, "·", segments.length, "segmentos ·", fmt(segments.at(-1)!.startSeconds));
