// Cliente mínimo de Supadata. Ver docs/investigacion/supadata.md.
import type { SegmentoTranscripcion } from "./historias.ts";

const BASE = "https://api.supadata.ai/v1";

export class SupadataError extends Error {
  readonly status: number;
  readonly codigo: string | undefined;
  constructor(status: number, codigo: string | undefined, mensaje: string) {
    super(`Supadata ${status}${codigo ? ` (${codigo})` : ""}: ${mensaje}`);
    this.status = status;
    this.codigo = codigo;
  }
}

/** El video no tiene subtítulos (206 transcript-unavailable). */
export class SinTranscripcionError extends SupadataError {}

interface SegmentoSupadata {
  text: string;
  offset: number; // ms
  duration: number; // ms
  lang: string;
}

interface Transcripcion {
  content: SegmentoSupadata[];
  lang: string;
  availableLangs: string[];
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function urlVideo(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

async function pedir(apiKey: string, path: string, intentos = 4): Promise<{ status: number; body: any }> {
  for (let intento = 1; ; intento++) {
    const res = await fetch(`${BASE}${path}`, { headers: { "x-api-key": apiKey } });
    const body = await res.json().catch(() => ({}));

    const esLimiteDeCuota = res.status === 429 && /Plan usage limit/i.test(body?.details ?? "");
    const reintentable = res.status >= 500 || (res.status === 429 && !esLimiteDeCuota);
    if (reintentable && intento < intentos) {
      await esperar(1000 * 2 ** intento);
      continue;
    }

    if (res.status === 206) {
      throw new SinTranscripcionError(206, body?.error, body?.message ?? "transcripción no disponible");
    }
    if (!res.ok) {
      throw new SupadataError(res.status, body?.error, body?.message ?? res.statusText);
    }
    return { status: res.status, body };
  }
}

export async function obtenerTituloVideo(apiKey: string, videoId: string): Promise<string> {
  const { body } = await pedir(apiKey, `/metadata?url=${encodeURIComponent(urlVideo(videoId))}`);
  if (typeof body?.title !== "string") throw new Error("Supadata no devolvió el título del video");
  return body.title;
}

export async function obtenerTranscripcion(apiKey: string, videoId: string): Promise<SegmentoTranscripcion[]> {
  const query = new URLSearchParams({ url: urlVideo(videoId), lang: "es", mode: "native" });
  let { status, body } = await pedir(apiKey, `/transcript?${query}`);

  // Con mode=native no debería haber job, pero la API lo permite: se hace polling por las dudas.
  if (status === 202 && body?.jobId) {
    body = await esperarJob(apiKey, body.jobId);
  }

  const transcripcion = body as Transcripcion;
  if (!transcripcion.lang?.startsWith("es")) {
    throw new Error(
      `La transcripción vino en "${transcripcion.lang}", no en español. Disponibles: ${transcripcion.availableLangs?.join(", ")}`,
    );
  }

  return transcripcion.content.map((s) => ({ texto: s.text, inicioSegundos: s.offset / 1000 }));
}

async function esperarJob(apiKey: string, jobId: string, timeoutMs = 10 * 60_000): Promise<unknown> {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    await esperar(1500); // el plan Free permite 1 request/s
    const { body } = await pedir(apiKey, `/transcript/${jobId}`);
    if (body.status === "completed") return body;
    if (body.status === "failed") {
      throw new SupadataError(500, body.error?.error, body.error?.message ?? "el job falló");
    }
  }
  throw new Error(`El job ${jobId} de Supadata no terminó en ${timeoutMs / 1000} s`);
}
