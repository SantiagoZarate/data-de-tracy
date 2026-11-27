// Uso: node --env-file=.env.local scripts/descargar-transcripcion.ts <videoId>
// Guarda título + transcripción con timestamps en .datos/ (gitignored: el repo es público, ver ADR 0001).
import { writeFile } from "node:fs/promises";
import { obtenerTituloVideo, obtenerTranscripcion } from "../src/ingesta/supadata.ts";

const videoId = process.argv[2];
const apiKey = process.env.SUPADATA_API_KEY!;
const titulo = await obtenerTituloVideo(apiKey, videoId);
const segmentos = await obtenerTranscripcion(apiKey, videoId);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const texto = [titulo, "", ...segmentos.map((s) => `[${fmt(s.inicioSegundos)}] ${s.texto}`)].join("\n");
await writeFile(`.datos/${videoId}.txt`, texto);
console.log(titulo, "·", segmentos.length, "segmentos ·", fmt(segmentos.at(-1)!.inicioSegundos));
