// Clasificador de Episodios con Jev (TypeSafe). Ver docs/investigacion/typesafe.md.
// Solo se usa para títulos que no matchean ningún formato conocido.

export type DecisionEpisodio = "si" | "no" | "revisar";

const URL_API = "https://api.typesafe.ai/v1/systemone";
const MODELO = "jev-1.14.0"; // fijo: jev-latest cambia de modelo sin aviso
const UMBRAL_SI = 0.7;
const UMBRAL_NO = 0.3;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function decidir(puntaje: number): DecisionEpisodio {
  return puntaje > UMBRAL_SI ? "si" : puntaje < UMBRAL_NO ? "no" : "revisar";
}

export function crearClasificadorJev(apiKey: string) {
  const puntuar = crearPuntuadorJev(apiKey);
  return async (tituloVideo: string): Promise<DecisionEpisodio> => decidir(await puntuar(tituloVideo));
}

/** Devuelve el noul crudo (0–1): qué tan seguro está Jev de que el título es de un Episodio. */
export function crearPuntuadorJev(apiKey: string) {
  return async function puntuarEpisodio(tituloVideo: string): Promise<number> {
    const body = JSON.stringify({
      model: MODELO,
      state: {
        video: { channel: "Anécdotas de Tracy", title: tituloVideo },
        podcast_episode_format:
          "An Argentine Spanish-language podcast. Each episode is a numbered full-length upload where the hosts read one or more stories sent in by listeners. Episode titles contain the episode number and a story title, in formats like 'Anécdota #307 - TITLE' (current) or 'Title- Anécdotas #59' (older episodes).",
      },
      questions: {
        is_episode: {
          type: "noul",
          instructions: "Is `video` a full numbered episode of the podcast described in `podcast_episode_format`?",
          criteria: {
            true: "A full numbered episode in which the hosts read stories sent in by listeners",
            false: "A clip or excerpt from an episode, a YouTube short, a trailer or announcement, a live stream, a stand-up show promo, or a video about something else",
          },
        },
      },
    });

    for (let intento = 1; ; intento++) {
      const res = await fetch(URL_API, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body,
      });
      const reintentable = res.status === 429 || res.status === 529 || res.status >= 500;
      if (reintentable && intento < 3) {
        await esperar(Number(res.headers.get("retry-after")) * 1000 || 500 * 2 ** intento);
        continue;
      }
      if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${await res.text()}`);

      const { answers } = (await res.json()) as { answers: { is_episode: { noul: number } } };
      return answers.is_episode.noul;
    }
  };
}
