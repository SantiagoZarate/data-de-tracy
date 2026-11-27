// Cliente mínimo de Supadata. Ver docs/investigacion/supadata.md.
import type { TranscriptSegment } from "./stories.ts";

const BASE = "https://api.supadata.ai/v1";

export class SupadataError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  constructor(status: number, code: string | undefined, message: string) {
    super(`Supadata ${status}${code ? ` (${code})` : ""}: ${message}`);
    this.status = status;
    this.code = code;
  }
}

/** El video no tiene subtítulos (206 transcript-unavailable). */
export class NoTranscriptError extends SupadataError {}

interface SupadataSegment {
  text: string;
  offset: number; // ms
  duration: number; // ms
  lang: string;
}

interface SupadataTranscript {
  content: SupadataSegment[];
  lang: string;
  availableLangs: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function videoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

async function request(
  apiKey: string,
  path: string,
  attempts = 4,
): Promise<{ status: number; body: any }> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, { headers: { "x-api-key": apiKey } });
    const body = await res.json().catch(() => ({}));

    const isQuotaLimit = res.status === 429 && /Plan usage limit/i.test(body?.details ?? "");
    const retryable = res.status >= 500 || (res.status === 429 && !isQuotaLimit);
    if (retryable && attempt < attempts) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }

    if (res.status === 206) {
      throw new NoTranscriptError(206, body?.error, body?.message ?? "transcripción no disponible");
    }
    if (!res.ok) {
      throw new SupadataError(res.status, body?.error, body?.message ?? res.statusText);
    }
    return { status: res.status, body };
  }
}

export async function getVideoTitle(apiKey: string, videoId: string): Promise<string> {
  const { body } = await request(apiKey, `/metadata?url=${encodeURIComponent(videoUrl(videoId))}`);
  if (typeof body?.title !== "string") throw new Error("Supadata no devolvió el título del video");
  return body.title;
}

export async function getTranscript(apiKey: string, videoId: string): Promise<TranscriptSegment[]> {
  const query = new URLSearchParams({ url: videoUrl(videoId), lang: "es", mode: "native" });
  let { status, body } = await request(apiKey, `/transcript?${query}`);

  // Con mode=native no debería haber job, pero la API lo permite: se hace polling por las dudas.
  if (status === 202 && body?.jobId) {
    body = await waitForJob(apiKey, body.jobId);
  }

  const transcript = body as SupadataTranscript;
  if (!transcript.lang?.startsWith("es")) {
    throw new Error(
      `La transcripción vino en "${transcript.lang}", no en español. Disponibles: ${transcript.availableLangs?.join(", ")}`,
    );
  }

  return transcript.content.map((s) => ({ text: s.text, startSeconds: s.offset / 1000 }));
}

async function waitForJob(
  apiKey: string,
  jobId: string,
  timeoutMs = 10 * 60_000,
): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(1500); // el plan Free permite 1 request/s
    const { body } = await request(apiKey, `/transcript/${jobId}`);
    if (body.status === "completed") return body;
    if (body.status === "failed") {
      throw new SupadataError(500, body.error?.error, body.error?.message ?? "el job falló");
    }
  }
  throw new Error(`El job ${jobId} de Supadata no terminó en ${timeoutMs / 1000} s`);
}
