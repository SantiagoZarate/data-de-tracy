import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { STORY_TYPES, THEMES } from "../story-metadata.ts";

export const storySchema = z.object({
  type: z.enum(STORY_TYPES),
  startSeconds: z
    .number()
    .int()
    .nonnegative()
    .describe("Segundo de la transcripción donde empieza la lectura de la Historia"),
  endSeconds: z
    .number()
    .int()
    .nonnegative()
    .describe("Segundo de la transcripción donde termina la lectura de la Historia"),
  title: z
    .string()
    .describe("Título corto propio de la Historia, en mayúsculas, sacado de su contenido"),
  summary: z.string().describe("Resumen de 2 a 3 líneas, en español"),
  storyCountry: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .describe(
      "Código ISO 3166-1 alfa-2 del país donde ocurre la Historia, o null si no se menciona",
    ),
  senderCountry: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .describe(
      "Código ISO 3166-1 alfa-2 del país de quien envió la Historia, o null si no se menciona",
    ),
  themes: z.array(z.enum(THEMES)).min(1).max(3),
});

export const storiesSchema = z.object({ stories: z.array(storySchema) });

export type Story = z.infer<typeof storySchema>;

export interface TranscriptSegment {
  text: string;
  startSeconds: number;
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

const SYSTEM_PROMPT = `Analizás transcripciones de "Anecdotas de Tracy", un podcast argentino donde los conductores leen en voz alta cartas que mandan los oyentes. Cada carta es una Historia.

Estructura típica de un Episodio:
1. A veces, una promo de un show de stand-up.
2. Una intro fija: "Si quieren compartir su anécdota, mándennos un mail… Los dejamos con un nuevo capítulo de anécdotas".
3. Charla de los conductores.
4. La Historia principal: la primera carta.
5. Comentarios de los conductores sobre esa Historia.
6. A veces, un Bonus Track: otra carta. Muy rara vez hay más de uno.
7. Comentarios sobre el Bonus Track.
8. Cierre: agradecen al equipo ("…por la edición", "…por la postproducción de sonido") y se despiden.

Cómo reconocer una Historia:
- Empieza cuando se empieza a leer la carta, que casi siempre arranca con un saludo a los conductores ("Hola, chicos", "Hola, Nico", "hola equipo"), seguido muchas veces del nombre, el pedido de anonimato o de dónde es quien escribe.
- Termina con la despedida de quien escribe ("Les mando un beso grande", "un abrazo grande a todo el equipo") o, si no hay despedida, con la última oración del relato. Lo que viene después de la despedida ya son comentarios de los conductores, aunque sigan hablando de la Historia durante minutos: no lo incluyas.
- Los conductores interrumpen la lectura con comentarios, a veces largos. Eso sigue siendo parte de la Historia: no la cortes ahí.
- La charla, los comentarios entre cartas y el cierre no son parte de ninguna Historia.

Cómo reconocer un Bonus Track:
- Es una carta nueva, con su propio saludo, que se lee después de los comentarios de la principal.
- A veces un conductor grita "¡Bonus Track!" antes, o presenta la carta ("llega otra anécdota…"). Pero la transcripción automática suele perder o deformar ese grito ("es track"), y a veces dicen "bonus track" en la charla sin que haya uno. Guiate por la carta nueva, no por la palabra.
- Si no hay una segunda carta, no hay Bonus Track. No inventes Historias.

La transcripción puede tener errores, sin puntuación ni mayúsculas. Reconocé las secciones por su estructura, no por frases exactas.

Para cada Historia devolvé:
- type: "principal" para la primera carta, "bonus" para las siguientes.
- startSeconds y endSeconds, según los timestamps [mm:ss] de la transcripción.
- title: uno propio, corto y en mayúsculas, sacado del contenido de la Historia. El título del Episodio sirve de referencia para el estilo, pero puede describir el Bonus Track o ninguna de las Historias: no lo copies.
- summary: resumen de 2 a 3 líneas en español.
- storyCountry: código ISO 3166-1 alfa-2 del país donde ocurre la Historia.
- senderCountry: código ISO 3166-1 alfa-2 del país de quien envía la carta.
  Pueden ser distintos (un argentino que cuenta algo que le pasó en Ámsterdam: storyCountry "NL", senderCountry "AR"). Usá null si la Historia no lo menciona ni se deduce con claridad de lo que cuenta (una ciudad, una provincia). No asumas Argentina por default.
- themes: entre 1 y 3 Temáticas, solo de la lista permitida.`;

export async function splitStories(params: {
  model: LanguageModel;
  episodeTitle: string;
  segments: TranscriptSegment[];
}): Promise<Story[]> {
  const transcript = params.segments
    .map((s) => `[${formatTime(s.startSeconds)}] ${s.text}`)
    .join("\n");

  const { output } = await generateText({
    model: params.model,
    output: Output.object({ schema: storiesSchema }),
    system: SYSTEM_PROMPT,
    prompt: `Título del Episodio: ${params.episodeTitle}\n\nTranscripción:\n${transcript}`,
  });

  return output.stories;
}
