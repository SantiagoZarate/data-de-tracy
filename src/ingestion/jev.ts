// Clasificador de Episodios con Jev (TypeSafe). Ver docs/investigacion/typesafe.md.
// Solo se usa para títulos que no matchean ningún formato conocido.

export type EpisodeDecision = "yes" | "no" | "review";

const API_URL = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-1.14.0"; // fijo: jev-latest cambia de modelo sin aviso
const YES_THRESHOLD = 0.7;
const NO_THRESHOLD = 0.3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function decide(score: number): EpisodeDecision {
  return score > YES_THRESHOLD ? "yes" : score < NO_THRESHOLD ? "no" : "review";
}

export function createJevClassifier(apiKey: string) {
  const score = createJevScorer(apiKey);
  return async (videoTitle: string): Promise<EpisodeDecision> => decide(await score(videoTitle));
}

/** Devuelve el noul crudo (0–1): qué tan seguro está Jev de que el título es de un Episodio. */
export function createJevScorer(apiKey: string) {
  return async function scoreEpisode(videoTitle: string): Promise<number> {
    const body = JSON.stringify({
      model: MODEL,
      state: {
        video: { channel: "Anécdotas de Tracy", title: videoTitle },
        podcast_episode_format:
          "An Argentine Spanish-language podcast. Each episode is a numbered full-length upload where the hosts read one or more stories sent in by listeners. Episode titles contain the episode number and a story title, in formats like 'Anécdota #307 - TITLE' (current) or 'Title- Anécdotas #59' (older episodes).",
      },
      questions: {
        is_episode: {
          type: "noul",
          instructions:
            "Is `video` a full numbered episode of the podcast described in `podcast_episode_format`?",
          criteria: {
            true: "A full numbered episode in which the hosts read stories sent in by listeners",
            false:
              "A clip or excerpt from an episode, a YouTube short, a trailer or announcement, a live stream, a stand-up show promo, or a video about something else",
          },
        },
      },
    });

    for (let attempt = 1; ; attempt++) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body,
      });
      const retryable = res.status === 429 || res.status === 529 || res.status >= 500;
      if (retryable && attempt < 3) {
        await sleep(Number(res.headers.get("retry-after")) * 1000 || 500 * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${await res.text()}`);

      const { answers } = (await res.json()) as { answers: { is_episode: { noul: number } } };
      return answers.is_episode.noul;
    }
  };
}
