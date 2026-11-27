# Investigación: API de TypeSafe (modelo Jev)

Para qué la queremos: cuando el título de un video no matchea ninguno de los dos formatos conocidos ("Anécdota #307 - TÍTULO" y "TÍTULO- Anécdotas #59"), preguntarle a Jev si el video es un Episodio antes de bajar la transcripción ([`objetivo.md`](../objetivo.md), [glosario](../../GLOSSARY.md)). Relevado el 2026-11-27, solo con fuentes primarias: la documentación oficial (docs.typesafe.ai, incluido su [`llms.txt`](https://docs.typesafe.ai/llms.txt) y la spec [OpenAPI](https://api.typesafe.ai/openapi.json)), el SDK oficial ([`@typesafe-ai/sdk` en npm](https://www.npmjs.com/package/@typesafe-ai/sdk) y su repo [typesafe-ai/typesafe-sdk-js](https://github.com/typesafe-ai/typesafe-sdk-js)) y la skill oficial para agentes ([SKILL.md](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)). `typesafe.ai/pricing` redirige a la página [Models](https://docs.typesafe.ai/models) de la doc.

## 1. Autenticación

- Header `Authorization: Bearer <API_KEY>` ([Quick start, "Call it: the API"](https://docs.typesafe.ai/introduction/quickstart), [OpenAPI](https://api.typesafe.ai/openapi.json): `info.description` y esquema `HTTPBearer`).
- La key se crea en la [consola](https://console.typesafe.ai/keys) ([Quick start](https://docs.typesafe.ai/introduction/quickstart)).
- Variable de entorno: **`TYPESAFE_API_KEY`**. La doc sugiere guardarla ahí ([Quick start](https://docs.typesafe.ai/introduction/quickstart)) y el SDK de JS la lee sola si no se pasa `apiKey` ([`ENV`](https://docs.typesafe.ai/sdk/javascript/api/variables/ENV), [`TypeSafeClientConfig`](https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig)). El SDK también lee `TYPESAFE_BASE_URL`, `TYPESAFE_DEFAULT_MODEL` (default `jev-latest`) y `TYPESAFE_LOG_LEVEL` (default `warn`) ([`ENV`](https://docs.typesafe.ai/sdk/javascript/api/variables/ENV)). En nuestro caso iría en `.env.local`.
- El SDK no corre en el navegador salvo con `dangerouslyAllowBrowser: true`, porque expone la key ([`TypeSafeClientConfig`](https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig)). No nos afecta: corre en Trigger.dev o en un script local.

## 2. Endpoint, request y response

Un solo endpoint para todo: **`POST https://api.typesafe.ai/v1/systemone`**, `Content-Type: application/json` ([Quick start](https://docs.typesafe.ai/introduction/quickstart), [System One](https://docs.typesafe.ai/api/system-one)). Hay además `GET /v1/models` para listar modelos y alias ([List models](https://docs.typesafe.ai/api/list-models)).

### Request

Schema `SystemOneRequest` ([System One](https://docs.typesafe.ai/api/system-one)):

| Campo       | Tipo                                       | Notas                                                                                                                                                                      |
| ----------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`     | string, **obligatorio**                    | `jev-latest` (alias) o un ID versionado como `jev-1.14.0`.                                                                                                                 |
| `state`     | string \| object \| array, **obligatorio** | El contenido que se evalúa. Todas las preguntas ven el mismo `state`.                                                                                                      |
| `questions` | object, **obligatorio**, mínimo 1          | Mapa `id → pregunta`. Los ids los elegimos nosotros; **el modelo no los ve**, y cada respuesta vuelve bajo el mismo id ([Noul](https://docs.typesafe.ai/primitives/noul)). |
| `assets`    | object, opcional                           | Solo para imágenes; no lo usamos.                                                                                                                                          |

Pregunta **Noul** (`NoulQuestion`, [System One](https://docs.typesafe.ai/api/system-one), [Noul](https://docs.typesafe.ai/primitives/noul)):

```ts
{
  type: "noul";
  instructions?: string | object | array | null; // la pregunta sí/no, o una afirmación a juzgar
  criteria?: { true?: string | object | array; false?: string | object | array } | null; // qué cuenta como sí y como no
}
```

Pregunta **Choice** (`ChoiceQuestion`, [System One](https://docs.typesafe.ai/api/system-one), [Choice](https://docs.typesafe.ai/primitives/choice)):

```ts
{
  type: "choice";
  instructions?: string | object | array | null;
  criteria: Record<string, string | object | array | null>; // 1 a 255 opciones; nombre → descripción (null = solo el nombre)
}
```

Los nombres de las opciones y sus descripciones sí se mandan al modelo ([Choice](https://docs.typesafe.ai/primitives/choice)).

### Response (HTTP 200)

Schema `SystemOneResponse` ([System One](https://docs.typesafe.ai/api/system-one)):

```ts
{
  model: string; // ID versionado que respondió, p. ej. "jev-1.14.0" (aunque se pida el alias)
  answers: Record<string, Answer>; // una por pregunta, bajo el id del request
  usage: {
    input_tokens: number;
    output_tokens: number;
  }
}

// Noul
{
  type: "noul";
  noul: number;
} // probabilidad de "sí", 0 a 1. Sin campo confidence.

// Choice
{
  type: "choice";
  choice: string; // la opción con mayor probabilidad
  confidence: number; // 0 a 1, derivado de probabilities
  probabilities: Record<string, number>; // una por opción, suman ~1
}
```

Ejemplo real de la doc, Noul ([Noul, "Response structure"](https://docs.typesafe.ai/primitives/noul)):

```json
{
  "model": "jev-1.14.0",
  "answers": { "is_human_escalation": { "type": "noul", "noul": 0.98 } },
  "usage": { "input_tokens": 344, "output_tokens": 43 }
}
```

Ejemplo de la spec, Choice ([System One](https://docs.typesafe.ai/api/system-one)):

```json
{
  "model": "jev-latest",
  "answers": {
    "tone": {
      "type": "choice",
      "choice": "calm",
      "confidence": 0.7,
      "probabilities": { "angry": 0.15, "calm": 0.8, "excited": 0.05 }
    }
  },
  "usage": { "input_tokens": 120, "output_tokens": 12 }
}
```

### `fetch` directo (mínimo)

Armado a partir del ejemplo en Bash del [Quick start](https://docs.typesafe.ai/introduction/quickstart):

```ts
const res = await fetch("https://api.typesafe.ai/v1/systemone", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "jev-1.14.0",
    state: { video: { channel: "Anécdotas de Tracy", title: "..." } },
    questions: {
      is_episode: { type: "noul", instructions: "Is `video` a full episode of the podcast?" },
    },
  }),
});
if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${await res.text()}`);
const { answers } = await res.json();
const p: number = answers.is_episode.noul;
```

### SDK oficial de JS/TS

- Paquete **`@typesafe-ai/sdk`**, versión **0.7.0** (la `latest` en npm al 2026-11-27, publicada el 2026-10-14), requiere Node ≥ 22; trae ESM, CommonJS y tipos ([JavaScript SDK](https://docs.typesafe.ai/sdk/javascript), [changelog](https://docs.typesafe.ai/sdk/javascript/changelog), `npm view @typesafe-ai/sdk`). Nuestro Node 24 sirve.
- Los tipos de las respuestas se infieren de las preguntas ([Quick start](https://docs.typesafe.ai/introduction/quickstart)). Firma de `noul(instructions, criteria?)` con `criteria = { true?, false? }` ([`noul`](https://docs.typesafe.ai/sdk/javascript/api/variables/noul)).

```ts
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient({ defaultModel: "jev-1.14.0" }); // lee TYPESAFE_API_KEY
const { answers, model } = await client.systemOne({
  state: { video: { channel: "Anécdotas de Tracy", title: "..." } },
  questions: { is_episode: noul("Is `video` a full episode of the podcast?") },
});
answers.is_episode.noul; // number
```

([Quick start, pestaña TypeScript](https://docs.typesafe.ai/introduction/quickstart), [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript)). A diferencia del API crudo, con el SDK `model` es opcional: usa `defaultModel` o `jev-latest` ([`TypeSafeClientConfig`](https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig)).

## 3. Cómo escribir la pregunta y leer el resultado

### Redacción de un Noul

- **Una sola pregunta sí/no por Noul.** Con dos condiciones ("¿y…?", "¿o…?") el valor significa menos; mejor dos Nouls combinados en código ([Noul, "Writing a Noul question"](https://docs.typesafe.ai/primitives/noul), [SKILL.md, "Write the questions"](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)).
- **Que un valor alto signifique "sí".** Nada de preguntas invertidas ("¿está libre de…?") ni de `criteria` donde `true` describa un no ([Noul](https://docs.typesafe.ai/primitives/noul), [Model jaggedness, "Contradictory instructions and criteria"](https://docs.typesafe.ai/model-jaggedness)).
- Pregunta o afirmación funcionan las dos; conviene probar ambas con datos propios ([Noul](https://docs.typesafe.ai/primitives/noul)).
- **Límite sí/no sin ambigüedad.** Si el borde es sutil, agregar `criteria` con `true` y `false`; describir el `false` como situaciones concretas ("un clip, un short, un anuncio"), no como "no es episodio" ([Noul](https://docs.typesafe.ai/primitives/noul), [SKILL.md, "Criteria"](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)). Probar con y sin `criteria` y quedarse con lo que ande mejor ([Noul](https://docs.typesafe.ai/primitives/noul)).
- **Escribir llano**: no es un prompt de LLM; sin preámbulos ni instrucciones de formato ([SKILL.md](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)).
- **Lectura literal**: Jev responde lo que está escrito, no lo que uno quiso decir; escribir la condición exacta y poner los casos borde en `criteria` ([Model jaggedness, "Literal reading"](https://docs.typesafe.ai/model-jaggedness)).
- **`state` como objeto con nombres**, y referirse a sus partes con la ruta entre backticks (p. ej. `` `video.title` ``) ([State](https://docs.typesafe.ai/concepts/state), [Primitives, "Reference specific fields"](https://docs.typesafe.ai/primitives)).
- **No meter de más en `state`**: el detalle irrelevante baja la precisión ([Model jaggedness, "Large state full of irrelevant detail"](https://docs.typesafe.ai/model-jaggedness)). Una descripción de YouTube larga, con links y sponsors, es justamente eso.
- Para comparar redacciones: mandar cada variante como una pregunta aparte en el mismo request, sobre el mismo `state` ([SKILL.md, "Test with the live API"](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)).

### Idioma (español)

- La doc **no dice explícitamente** qué idiomas soporta ni menciona el español. Lo único: Jev 1.14 trae "Better multilingual support" ([Model changelog](https://docs.typesafe.ai/changelog)). Todos los ejemplos de la doc están en inglés.
- Uno de los patrones de la doc es filtrar por "written in English" antes de otro paso ([Screen with a Noul first, "Other ways to screen"](https://docs.typesafe.ai/patterns/noul-screen)), lo que sugiere (inferencia nuestra) que trata el idioma como algo a juzgar, no como un límite. Hay que verificarlo con nuestros títulos.

### Interpretar el valor

- `noul` es la **probabilidad de que la respuesta sea sí** (0 = no, 1 = sí, ~0.5 = no sabe). No es una escala de grado ([Noul, "Reading a Noul"](https://docs.typesafe.ai/primitives/noul), [OpenAPI `NoulAnswer`](https://api.typesafe.ai/openapi.json)).
- **No hay `confidence` en un Noul**: el propio valor ya dice la certeza. Si se quiere uno, `|2p − 1|` ([Confidence, "Noul"](https://docs.typesafe.ai/confidence)).
- **Umbrales de arranque: > 0.7 es sí, < 0.3 es no, y la franja 0.3–0.7 tiene su propio camino** (p. ej. revisión manual), no se redondea. Subir el umbral si un falso sí es caro; bajarlo si perder un sí verdadero es caro; no ajustarlo a mano a un puñado de casos ([Noul](https://docs.typesafe.ai/primitives/noul), [Confidence, "When to act on confidence"](https://docs.typesafe.ai/confidence), [Screen with a Noul first](https://docs.typesafe.ai/patterns/noul-screen)).
- Para un Choice, el umbral va sobre la **probabilidad de la opción elegida** (`probabilities[choice]`), no sobre `confidence`, que es solo una transformación de esa probabilidad ([Confidence](https://docs.typesafe.ai/confidence)). Un Choice **siempre elige una opción**, aunque ninguna aplique, a veces con probabilidad alta; la doc recomienda acompañarlo con un "companion Noul" que pregunte si alguna opción aplica, en vez de una opción `other` ([Companion Noul](https://docs.typesafe.ai/patterns/companion-noul), [Choice](https://docs.typesafe.ai/primitives/choice)). Además Jev tiende a favorecer la primera opción en algunos casos ([Model jaggedness, "Choice option order"](https://docs.typesafe.ai/model-jaggedness)).
- Varias preguntas en un request se evalúan en paralelo y el `state` se paga una vez, así que agregar Nouls casi no cambia el tiempo de respuesta ([Noul](https://docs.typesafe.ai/primitives/noul), [Screen with a Noul first](https://docs.typesafe.ai/patterns/noul-screen)). Cada pregunta se responde sola: no ve las otras ni sus respuestas ([SKILL.md](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)).

## 4. Precio, límites y latencia

| Concepto              | Valor                                                                                                                                 | Fuente                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Precio                | USD 0,042 por millón de tokens de entrada (USD 42 por billón); los de salida son gratis                                               | [Models](https://docs.typesafe.ai/models), [OpenAPI `Usage`](https://api.typesafe.ai/openapi.json) |
| Contexto              | 64k tokens por request / 32k por pregunta (262k con el header `TypeSafe-Danger-Zone-Long-Context: true`, más lento y menos preciso)   | [Models](https://docs.typesafe.ai/models)                                                          |
| Cantidad de preguntas | Sin límite propio, mientras entren en el contexto                                                                                     | [Models](https://docs.typesafe.ai/models)                                                          |
| Rate limit            | Por organización, en tokens/s y requests/s; los valores se ven en la [consola](https://console.typesafe.ai/rate-limits), no en la doc | [Models, "Rate limits"](https://docs.typesafe.ai/models)                                           |
| Latencia              | "Most calls complete in about 100 ms"                                                                                                 | [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)       |
| Body                  | Máximo 32 MiB, JSON UTF-8 sin BOM, hasta 64 niveles de anidación                                                                      | [Request rules and errors](https://docs.typesafe.ai/api/errors)                                    |

- **Free tier**: no está documentado en docs.typesafe.ai ni en typesafe.ai. No aparece ni plan gratis ni créditos iniciales.
- **Costo para nosotros** (cálculo nuestro): los ejemplos de la doc con un mensaje corto y 1–2 preguntas usan ~350–550 tokens de entrada ([Noul](https://docs.typesafe.ai/primitives/noul), [Companion Noul](https://docs.typesafe.ai/patterns/companion-noul)). Con ~500 tokens por llamada, el backfill de 300 títulos es ~150.000 tokens ≈ **USD 0,006**, y la ingesta semanal es despreciable. El costo no es un factor.

## 5. Errores y reintentos

Códigos ([Request rules and errors](https://docs.typesafe.ai/api/errors)):

| HTTP | Significado                                                                                                     | ¿Reintentar?                |
| ---- | --------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 400  | Body inválido (UTF-8, anidación, números no finitos). Con `max_tokens_exceeded`, el request excede el contexto. | No                          |
| 401  | Key faltante o inválida                                                                                         | No                          |
| 413  | Body > 32 MiB                                                                                                   | No                          |
| 415  | `Content-Encoding` no soportado o doble compresión                                                              | No                          |
| 422  | Falla de validación (campo faltante, pregunta mal armada)                                                       | No                          |
| 429  | Rate limit                                                                                                      | Sí, con backoff exponencial |
| 529  | TypeSafe sobrecargado                                                                                           | Sí, con backoff exponencial |

- Formato del cuerpo: 400 → `{ "detail": string | object }`; 422 → `{ "detail": [{ "loc": [...], "msg": string, "type": string, "input"?: string, "ctx"?: object }] }` ([System One, `HTTPBadRequestError` / `HTTPValidationError`](https://docs.typesafe.ai/api/system-one)).
- El 429 puede traer `retry-after`; los SDKs lo respetan ([Models, "Rate limits"](https://docs.typesafe.ai/models)). La doc pide backoff exponencial y no reintentar en el acto ([Request rules and errors, "Handling rate limits"](https://docs.typesafe.ai/api/errors)).
- **Política del SDK de JS** por defecto: 2 reintentos tras el primer intento; reintenta 408, 429 y 500–599 (incluye 529), errores de conexión y timeouts; backoff desde 500 ms, doblando hasta 5 s, con 25 % de jitter; respeta `Retry-After` y `retry-after-ms` hasta 60 s ([`RetryPolicy`](https://docs.typesafe.ai/sdk/javascript/api/interfaces/RetryPolicy)). Timeout por intento: 10 s, sin presupuesto total ([`TypeSafeClientConfig`](https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig)).
- El SDK lanza subclases de `APIError` (`AuthenticationError`, `BadRequestError`, `RateLimitError`, `UnprocessableEntityError`, `InternalServerError`…) con `status`, `body`, `headers` y `requestId` (del header `x-typesafe-request-id`) ([`APIError`](https://docs.typesafe.ai/sdk/javascript/api/classes/APIError)). Conviene loguear el request ID.

## 6. Gotchas

1. **`model` es obligatorio en el API crudo** ([OpenAPI `SystemOneRequest`](https://api.typesafe.ai/openapi.json)); los ejemplos con SDK lo omiten porque el SDK lo completa.
2. **Los alias se mueven.** `jev-latest` cambia de modelo cuando sale una versión nueva y las respuestas pueden cambiar sin tocar código. Si se ajustan umbrales contra una versión, fijar el ID (`jev-1.14.0`) y loguear `model` de la respuesta ([Models, "Aliases"](https://docs.typesafe.ai/models)).
3. **Español no documentado** (sección 3). Verificar con títulos reales antes de confiar.
4. **Un Choice nunca dice "ninguna"**: siempre elige, aun con probabilidad alta. Para "¿es un Episodio?" un Noul es lo correcto; si se usa Choice (p. ej. episodio/clip/short/anuncio), acompañarlo con un Noul ([Companion Noul](https://docs.typesafe.ai/patterns/companion-noul)).
5. **Números y cuentas, en código.** Jev no es bueno comparando números ni fechas ([Model jaggedness, "Math and Numbers", "Date and time comparison"](https://docs.typesafe.ai/model-jaggedness)). Si queremos usar la duración del video (p. ej. descartar shorts), la regla va en código, no en la pregunta.
6. **Contenido adversarial**: el `state` es dato, pero un texto que "argumenta" su propia clasificación puede mover la respuesta ([Model jaggedness, "Adversarial content"](https://docs.typesafe.ai/model-jaggedness)). Bajo riesgo con títulos, pero otra razón para no mandar la descripción entera.
7. **El SDK comprime con zstd** los bodies ≥ 1 KiB en Node ≥ 22.15 ([JavaScript SDK, "Request compression"](https://docs.typesafe.ai/sdk/javascript)). Con `fetch` crudo no hace falta.
8. **Ojo con el logging del SDK**: con `logLevel: "debug"` loguea los bodies sin redactar (los headers de credenciales sí se redactan) ([`TypeSafeClientConfig`](https://docs.typesafe.ai/sdk/javascript/api/interfaces/TypeSafeClientConfig)).
9. **Los valores de ejemplo de la doc pueden cambiar entre versiones de Jev** ([Quick start](https://docs.typesafe.ai/introduction/quickstart)); no escribir tests que esperen una probabilidad exacta ([SKILL.md, "Yellow flags"](https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md)).

## Recomendación para el filtro de Episodios

- **Un request, un Noul principal**, más una variante de redacción en el mismo request mientras probamos (cuesta casi nada y la doc lo sugiere para comparar). Con `fetch` directo alcanza: es un solo POST, y el SDK solo suma reintentos que podemos escribir en pocas líneas. Si se usa el SDK, fijar `@typesafe-ai/sdk@0.7.0`.
- **`state`**: objeto chico y con nombres. Título siempre; canal como contexto; la descripción solo si hace falta, y recortada (primeras líneas), por el problema del `state` con ruido ([Model jaggedness](https://docs.typesafe.ai/model-jaggedness)).
- **Request propuesto**:

```json
{
  "model": "jev-1.14.0",
  "state": {
    "video": {
      "channel": "Anécdotas de Tracy",
      "title": "<título del video>",
      "description": "<primeras ~3 líneas de la descripción, opcional>"
    },
    "podcast_episode_format": "Each episode is a numbered full-length upload where the hosts read one or more stories sent in by listeners."
  },
  "questions": {
    "is_episode": {
      "type": "noul",
      "instructions": "Is `video` a full numbered episode of the podcast?",
      "criteria": {
        "true": "A full episode in which the hosts read stories sent in by listeners",
        "false": "A clip or excerpt from an episode, a YouTube short, a trailer or announcement, a live stream, or a video about something else"
      }
    }
  }
}
```

La pregunta en inglés por default, porque es como están todos los ejemplos; en la primera prueba, mandar también `is_episode_es` con la misma pregunta en español y quedarse con la que separe mejor. La descripción de `podcast_episode_format` es nuestra y hay que ajustarla a lo que de verdad son los Episodios ([glosario](../../GLOSSARY.md)).

- **Lógica de umbrales** (los de arranque de la doc, [Noul](https://docs.typesafe.ai/primitives/noul)):
  - `noul > 0.7` → es Episodio: bajar la transcripción.
  - `noul < 0.3` → no es Episodio: saltearlo.
  - `0.3 ≤ noul ≤ 0.7` → no procesar automáticamente: dejarlo marcado para revisión manual (es la franja que la doc pide no redondear). Con este volumen es barato revisarlo a mano.
  - Un falso sí cuesta una transcripción de Supadata y una Historia basura; un falso no pierde un Episodio. Las dos cosas son corregibles, así que 0.7/0.3 está bien para empezar; si la revisión manual recibe demasiados, achicar la franja.
- **Errores**: reintentar 429 y 529 (y 5xx, como hace el SDK) con backoff exponencial y respetando `retry-after`; no reintentar 400/401/413/415/422. Si TypeSafe falla del todo, tratar el video como "revisión manual", nunca como Episodio.
- **Guardar** el `noul`, el `model` de la respuesta y el request ID por video, para poder re-evaluar si cambiamos umbrales o versión.
- **Antes del backfill**: listar los títulos del canal que no matchean los regex, correr el request sobre todos (~centavos) y revisar a mano la distribución de `noul` para confirmar que el español anda y que 0.7/0.3 separa bien. Lo que sea regla numérica (duración de shorts) va en código antes de llamar a Jev.
