// Uso: pnpm procesar-episodio <videoId | URL de YouTube>
import { anthropic } from "@ai-sdk/anthropic";
import { crearClasificadorJev } from "../src/ingesta/jev.ts";
import { procesarEpisodio } from "../src/ingesta/procesar-episodio.ts";

function extraerVideoId(entrada: string): string {
  if (/^[\w-]{11}$/.test(entrada)) return entrada;
  const url = new URL(entrada);
  const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
  if (!id) throw new Error(`No se pudo sacar el ID del video de "${entrada}"`);
  return id;
}

const entrada = process.argv[2];
if (!entrada) {
  console.error("Uso: pnpm procesar-episodio <videoId | URL de YouTube>");
  process.exit(1);
}

const supadataApiKey = process.env.SUPADATA_API_KEY;
if (!supadataApiKey) throw new Error("Falta SUPADATA_API_KEY en .env.local");

const resultado = await procesarEpisodio(extraerVideoId(entrada), {
  supadataApiKey,
  model: anthropic("claude-haiku-5-5"),
  // Sin TYPESAFE_API_KEY, los títulos con formato desconocido van a revisión.
  esEpisodio: process.env.TYPESAFE_API_KEY ? crearClasificadorJev(process.env.TYPESAFE_API_KEY) : undefined,
});

console.log(JSON.stringify(resultado, null, 2));
