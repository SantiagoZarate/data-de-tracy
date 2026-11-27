import type { LanguageModel } from "ai";
import type { EpisodeDecision } from "./jev.ts";
import { splitStories, type Story } from "./stories.ts";
import { getTranscript, getVideoTitle } from "./supadata.ts";
import { extractFreeformTitle, parseEpisodeTitle, type EpisodeTitle } from "./title.ts";

export interface ProcessEpisodeDeps {
  supadataApiKey: string;
  model: LanguageModel;
  /**
   * Decide si un título con formato desconocido es de un Episodio. Solo se llama
   * cuando el título no matchea ningún formato conocido. Sin esto, esos videos se mandan a revisión.
   */
  isEpisode?: (videoTitle: string) => Promise<EpisodeDecision>;
}

export type ProcessingResult =
  | {
      status: "processed";
      videoId: string;
      number: number;
      title: string;
      /** El título no tenía formato conocido: revisar número y título a mano. */
      needsTitleReview: boolean;
      stories: Story[];
    }
  | { status: "discarded"; videoId: string; reason: string }
  /** No se pudo decidir si es un Episodio: revisar a mano. No se bajó la transcripción. */
  | { status: "review"; videoId: string; reason: string };

/**
 * Procesa un video de YouTube de punta a punta: título, transcripción,
 * separación en Historias y metadatos. No depende de dónde corre
 * (CLI, backfill o Trigger.dev).
 */
export async function processEpisode(
  videoId: string,
  deps: ProcessEpisodeDeps,
): Promise<ProcessingResult> {
  const videoTitle = await getVideoTitle(deps.supadataApiKey, videoId);

  let episode: EpisodeTitle | null = parseEpisodeTitle(videoTitle);
  const needsTitleReview = !episode;
  if (!episode) {
    const decision = await decideIfEpisode(videoTitle, deps.isEpisode);
    if (decision === "no") {
      return { status: "discarded", videoId, reason: `"${videoTitle}" no es un Episodio` };
    }
    if (decision === "review") {
      return {
        status: "review",
        videoId,
        reason: `No se sabe si "${videoTitle}" es un Episodio`,
      };
    }
    episode = extractFreeformTitle(videoTitle);
    if (!episode) {
      return {
        status: "review",
        videoId,
        reason: `"${videoTitle}" parece un Episodio pero no tiene número`,
      };
    }
  }

  const segments = await getTranscript(deps.supadataApiKey, videoId);
  const stories = await splitStories({
    model: deps.model,
    episodeTitle: episode.title,
    segments,
  });

  return { status: "processed", videoId, ...episode, needsTitleReview, stories };
}

/** Si el clasificador falta o falla, el video va a revisión: nunca se lo trata como Episodio. */
async function decideIfEpisode(
  videoTitle: string,
  isEpisode: ProcessEpisodeDeps["isEpisode"],
): Promise<EpisodeDecision> {
  if (!isEpisode) return "review";
  try {
    return await isEpisode(videoTitle);
  } catch (error) {
    console.error(`El clasificador de Episodios falló para "${videoTitle}":`, error);
    return "review";
  }
}
