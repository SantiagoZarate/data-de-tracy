import type { LanguageModel } from "ai";
import { separarHistorias, type Historia } from "./historias.ts";
import { obtenerTituloVideo, obtenerTranscripcion } from "./supadata.ts";
import type { DecisionEpisodio } from "./jev.ts";
import { extraerTituloLibre, parsearTituloEpisodio, type TituloEpisodio } from "./titulo.ts";

export interface ProcesarEpisodioDeps {
  supadataApiKey: string;
  model: LanguageModel;
  /**
   * Decide si un título con formato desconocido es de un Episodio. Solo se llama
   * cuando el título no matchea ningún formato conocido. Sin esto, esos videos se mandan a revisión.
   */
  esEpisodio?: (tituloVideo: string) => Promise<DecisionEpisodio>;
}

export type ResultadoProcesamiento =
  | {
      estado: "procesado";
      videoId: string;
      numero: number;
      titulo: string;
      /** El título no tenía formato conocido: revisar número y título a mano. */
      revisarTitulo: boolean;
      historias: Historia[];
    }
  | { estado: "descartado"; videoId: string; motivo: string }
  /** No se pudo decidir si es un Episodio: revisar a mano. No se bajó la transcripción. */
  | { estado: "revisar"; videoId: string; motivo: string };

/**
 * Procesa un video de YouTube de punta a punta: título, transcripción,
 * separación en Historias y metadatos. No depende de dónde corre
 * (CLI, backfill o Trigger.dev).
 */
export async function procesarEpisodio(videoId: string, deps: ProcesarEpisodioDeps): Promise<ResultadoProcesamiento> {
  const tituloVideo = await obtenerTituloVideo(deps.supadataApiKey, videoId);

  let episodio: TituloEpisodio | null = parsearTituloEpisodio(tituloVideo);
  const revisarTitulo = !episodio;
  if (!episodio) {
    const decision = await decidirSiEsEpisodio(tituloVideo, deps.esEpisodio);
    if (decision === "no") {
      return { estado: "descartado", videoId, motivo: `"${tituloVideo}" no es un Episodio` };
    }
    if (decision === "revisar") {
      return { estado: "revisar", videoId, motivo: `No se sabe si "${tituloVideo}" es un Episodio` };
    }
    episodio = extraerTituloLibre(tituloVideo);
    if (!episodio) {
      return { estado: "revisar", videoId, motivo: `"${tituloVideo}" parece un Episodio pero no tiene número` };
    }
  }

  const segmentos = await obtenerTranscripcion(deps.supadataApiKey, videoId);
  const historias = await separarHistorias({ model: deps.model, tituloEpisodio: episodio.titulo, segmentos });

  return { estado: "procesado", videoId, ...episodio, revisarTitulo, historias };
}

/** Si el clasificador falta o falla, el video va a revisión: nunca se lo trata como Episodio. */
async function decidirSiEsEpisodio(
  tituloVideo: string,
  esEpisodio: ProcesarEpisodioDeps["esEpisodio"],
): Promise<DecisionEpisodio> {
  if (!esEpisodio) return "revisar";
  try {
    return await esEpisodio(tituloVideo);
  } catch (error) {
    console.error(`El clasificador de Episodios falló para "${tituloVideo}":`, error);
    return "revisar";
  }
}
