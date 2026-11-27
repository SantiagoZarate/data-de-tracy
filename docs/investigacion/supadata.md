# Investigación: API de Supadata

Qué necesitamos de Supadata para procesar un Episodio (issue #1): el título del video y la transcripción en español con timestamps. Relevado el 2026-11-27, solo con fuentes primarias: la documentación oficial (docs.supadata.ai, incluido su [`llms.txt`](https://docs.supadata.ai/llms.txt) y la spec [OpenAPI v1](https://docs.supadata.ai/api-reference/v1-openapi.json)), la [página de precios](https://supadata.ai/pricing) y el SDK oficial ([`@supadata/js` en npm](https://www.npmjs.com/package/@supadata/js) y su repo [supadata-ai/js](https://github.com/supadata-ai/js)).

## 1. Autenticación

- Todas las llamadas van a la base `https://api.supadata.ai/v1` con el header `x-api-key: <API_KEY>` ([API Reference](https://docs.supadata.ai/api-reference/introduction)). La spec lo declara como `apiKey` en header `x-api-key` ([OpenAPI](https://docs.supadata.ai/api-reference/v1-openapi.json)).
- La key se obtiene en el dashboard ([dash.supadata.ai](https://dash.supadata.ai/organizations/api-key)). La doc pide no commitearla, usar variables de entorno y llamar a la API solo desde un servidor ([Introducción](https://docs.supadata.ai/index)). En nuestro caso vive en `.env.local`.
- El SDK la recibe en el constructor: `new Supadata({ apiKey })`, y la manda como `x-api-key` ([Node SDK](https://docs.supadata.ai/integrations/node), [client.ts](https://github.com/supadata-ai/js/blob/main/src/client.ts)).

## 2. Endpoints de transcripción

Hay dos:

| Endpoint                         | Estado         | Identifica el video con | `mode` |
| -------------------------------- | -------------- | ----------------------- | ------ |
| `GET /v1/transcript` (universal) | vigente        | `url` (obligatorio)     | sí     |
| `GET /v1/youtube/transcript`     | **deprecated** | `url` o `videoId`       | no     |

El de YouTube está marcado `deprecated: true` en la spec ([OpenAPI](https://docs.supadata.ai/api-reference/v1-openapi.json), [referencia](https://docs.supadata.ai/api-reference/endpoint/youtube/transcript)), y el SDK lo marca `@deprecated` a favor de `supadata.transcript()` ([`@supadata/js` 1.4.0, `dist/index.d.ts`](https://www.npmjs.com/package/@supadata/js)). Usamos el universal.

### Parámetros de `GET /v1/transcript`

Fuente: [Transcript](https://docs.supadata.ai/get-transcript) y [referencia](https://docs.supadata.ai/api-reference/endpoint/transcript/transcript).

| Parámetro   | Tipo                                             | Notas                                                                                                                                      |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `url`       | string, obligatorio                              | URL del video (`https://www.youtube.com/watch?v=<ID>`). Recomiendan encodearla. No acepta `videoId`.                                       |
| `lang`      | string                                           | Idioma preferido (ISO 639-1), p. ej. `es`.                                                                                                 |
| `text`      | boolean, default `false`                         | `true` devuelve texto plano, **sin timestamps**.                                                                                           |
| `chunkSize` | number, 50–10000                                 | Máximo de caracteres por segmento. Solo con `text=false`.                                                                                  |
| `mode`      | `native` \| `auto` \| `generate`, default `auto` | `native`: solo trae la transcripción existente. `generate`: siempre la genera con IA. `auto`: prueba `native` y, si no hay, genera con IA. |

### Respuesta (HTTP 200, `text=false`)

```ts
{
  content: Array<{
    text: string;      // texto del segmento
    offset: number;    // inicio, en milisegundos
    duration: number;  // duración, en milisegundos
    lang: string;      // idioma del segmento (ISO 639-1)
  }>;
  lang: string;              // idioma de la transcripción
  availableLangs: string[];  // idiomas disponibles
}
```

`offset` y `duration` están en **milisegundos** ([Transcript](https://docs.supadata.ai/get-transcript), schema `TranscriptChunk` en la [OpenAPI](https://docs.supadata.ai/api-reference/v1-openapi.json)). En el schema, `text`, `offset` y `duration` son obligatorios; el `lang` del segmento no ([OpenAPI](https://docs.supadata.ai/api-reference/v1-openapi.json)). Con `text=true`, `content` es un string ([Transcript](https://docs.supadata.ai/get-transcript)).

Un 200 con `content: []` significa que no se detectó habla, y se cobra igual ([Transcript](https://docs.supadata.ai/get-transcript)).

## 3. Comportamiento asíncrono

- El endpoint puede responder 200 con la transcripción o **202 con `{ "jobId": string }`** ([Transcript](https://docs.supadata.ai/get-transcript)).
- El 202 aparece cuando hay generación con IA: los videos de más de 20 minutos disparan siempre un job, y un pedido de YouTube puede empezar síncrono y pasar a job en el medio. Para `mode=generate` hay que esperar un 202 sin importar la duración ([Transcript, "AI Transcription Time"](https://docs.supadata.ai/get-transcript#latency)). Las transcripciones existentes (`native`) se resuelven con latencia normal ([Transcript, "Latency"](https://docs.supadata.ai/get-transcript#latency)).
- Polling: `GET /v1/transcript/{jobId}` con el mismo header. Responde `{ status, error?, content?, lang?, availableLangs? }`: con `completed`, los datos de la transcripción vienen **en el nivel superior** (no dentro de `result`) ([Transcript](https://docs.supadata.ai/get-transcript), [referencia](https://docs.supadata.ai/api-reference/endpoint/transcript/transcript-get)).
- Estados: `queued`, `active`, `completed`, `failed`. Con `failed` viene `error` con el formato de error estándar ([Transcript](https://docs.supadata.ai/get-transcript), schema `JobResult` en la [OpenAPI](https://docs.supadata.ai/api-reference/v1-openapi.json)).
- Recomiendan consultar **cada 1 segundo**. El resultado queda disponible **1 hora** después de completarse; después, el endpoint devuelve 404 ([Transcript, "Polling Guidelines"](https://docs.supadata.ai/get-transcript)). Consultar el estado no cuesta créditos ([Transcript, "Pricing"](https://docs.supadata.ai/get-transcript#pricing)).
- Timeouts: un pedido síncrono con IA puede tardar **hasta ~100 s** antes de devolver resultado o jobId. Si el cliente corta antes, el pedido se cobra igual ([Transcript, "Latency"](https://docs.supadata.ai/get-transcript#latency)). La doc no fija un tiempo máximo para que un job termine.

## 4. Idioma

- Se pide español con `lang=es` ([Languages](https://docs.supadata.ai/youtube/supported-language-codes)). La tabla de códigos solo lista `es`, sin variantes regionales.
- Si no hay transcripción en el idioma pedido, la API devuelve la del **primer idioma disponible** y la lista `availableLangs`. Se puede volver a pedir con otro idioma de esa lista ([Transcript, "Languages"](https://docs.supadata.ai/get-transcript#languages)). No da error: hay que comparar `lang` de la respuesta con `es`.
- Con `mode=generate`, `lang` se ignora y la transcripción sale en el idioma del video ([Transcript, "Languages"](https://docs.supadata.ai/get-transcript#languages)).
- Para traducir hay un endpoint aparte, `/youtube/transcript/translate`, que cuesta 30 créditos por minuto y es de Pro en adelante ([precios](https://supadata.ai/pricing)). No lo necesitamos.
- **Subtítulos automáticos de YouTube**: la doc no distingue entre subtítulos subidos por el canal y los generados automáticamente por YouTube. Solo habla de transcripción "existente" (`native`) contra "generada con IA" (`generate`) ([Transcript](https://docs.supadata.ai/get-transcript)). No está documentado si los automáticos de YouTube cuentan como `native`. Hay que verificarlo con el primer episodio (ver Gotchas).

## 5. Título y metadatos del video

Dos opciones:

| Endpoint                       | Estado         | Parámetro       | Título en |
| ------------------------------ | -------------- | --------------- | --------- |
| `GET /v1/metadata` (universal) | vigente        | `url`           | `title`   |
| `GET /v1/youtube/video`        | **deprecated** | `id` (URL o ID) | `title`   |

([OpenAPI](https://docs.supadata.ai/api-reference/v1-openapi.json), [Video](https://docs.supadata.ai/api-reference/endpoint/youtube/video-get), [Metadata](https://docs.supadata.ai/get-metadata)). El SDK también marca `youtube.video()` como deprecated a favor de `supadata.metadata()` ([`@supadata/js` 1.4.0](https://www.npmjs.com/package/@supadata/js)).

Respuesta de `/v1/metadata` ([Metadata](https://docs.supadata.ai/get-metadata), schema `Metadata` en la [OpenAPI](https://docs.supadata.ai/api-reference/v1-openapi.json)):

```ts
{
  platform: "youtube";
  type: "video";
  id: string;                 // ID del video
  url: string;
  title: string | null;
  description: string | null;
  author: { username?: string; displayName: string; avatarUrl?: string; verified?: boolean };
  stats: { views: number | null; likes: number | null; comments: number | null; shares: number | null };
  media: { type: "video"; duration?: number /* segundos */; thumbnailUrl?: string };
  tags: string[];
  createdAt: string;          // ISO 8601
  additionalData: { channelId?: string; ... };
}
```

- `title` puede ser `null` según la plataforma ([Metadata, "Base Schema"](https://docs.supadata.ai/get-metadata)).
- `media.duration` está en **segundos**, a diferencia de los segmentos de la transcripción, que están en milisegundos ([Metadata](https://docs.supadata.ai/get-metadata)).
- Las respuestas pueden venir de una caché de hasta ~10 minutos ([Metadata](https://docs.supadata.ai/get-metadata)).
- Cuesta 1 crédito ([Metadata, "Pricing"](https://docs.supadata.ai/get-metadata#pricing)).

## 6. Precios, créditos y límites

### Créditos por llamada

| Llamada                                                 | Costo                          | Fuente                                                                                                                         |
| ------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Transcripción existente (`native`, o `auto` cuando hay) | 1 crédito                      | [Transcript](https://docs.supadata.ai/get-transcript#pricing)                                                                  |
| Transcripción generada con IA                           | 2 créditos por minuto de video | [Transcript](https://docs.supadata.ai/get-transcript#pricing)                                                                  |
| 206 "transcript unavailable" (video sin subtítulos)     | 1 crédito                      | [Transcript](https://docs.supadata.ai/get-transcript#pricing), [error](https://docs.supadata.ai/errors/transcript-unavailable) |
| Errores 5xx                                             | 0                              | [Transcript](https://docs.supadata.ai/get-transcript#pricing)                                                                  |
| Consultar estado de un job                              | 0                              | [Transcript](https://docs.supadata.ai/get-transcript#pricing)                                                                  |
| Metadatos (`/metadata`)                                 | 1 crédito                      | [Metadata](https://docs.supadata.ai/get-metadata#pricing)                                                                      |
| Listar videos de un canal (`/youtube/channel/videos`)   | 1 crédito                      | [Channel Videos](https://docs.supadata.ai/youtube/channel-videos)                                                              |
| Cada video en un batch                                  | 1 crédito                      | [Batch](https://docs.supadata.ai/youtube/batch)                                                                                |

Cada respuesta trae el header `x-billable-requests` con los créditos consumidos. En un 202 es una estimación que se ajusta al terminar el job; el polling informa `0` ([Transcript, "Tracking Credit Usage"](https://docs.supadata.ai/get-transcript#pricing)).

### Planes

Según la [página de precios](https://supadata.ai/pricing):

| Plan  | Precio                             | Créditos/mes | Requests/seg |
| ----- | ---------------------------------- | ------------ | ------------ |
| Free  | gratis                             | 100          | 1            |
| Basic | USD 5/mes, solo anual (USD 60/año) | 300          | 10           |
| Pro   | USD 17/mes                         | 3.000        | 10           |
| Mega  | USD 47/mes                         | 30.000       | 50           |

- Los créditos no se acumulan de un mes al otro. Al llegar al tope no se pueden hacer más pedidos hasta subir de plan o activar Auto Recharge (solo planes pagos) ([precios](https://supadata.ai/pricing)).
- Los endpoints de batch y traducción son de Pro en adelante ([Batch](https://docs.supadata.ai/youtube/batch), [precios](https://supadata.ai/pricing)).
- El rate limit depende del plan, aplica a todos los endpoints salvo `/v1/me` y se puede pedir que lo suban ([API Reference](https://docs.supadata.ai/api-reference/introduction), [Introducción](https://docs.supadata.ai/index)).

### Costo del backfill (~300 Episodios)

Cálculo nuestro con los precios de arriba:

- **Si todos tienen subtítulos existentes** (`mode=native`): 300 transcripciones + 300 metadatos = **~600 créditos**, más alguna llamada para listar el canal. No entra en Free (100) ni en Basic (300). Entra en **un mes de Pro** (3.000 créditos, USD 17), con margen para re-procesar.
- **Si hubiera que generar con IA**: 2 créditos por minuto. Con episodios de ~45 minutos (duración supuesta, no medida), son ~90 créditos por episodio y **~27.000 para los 300**: haría falta Mega (USD 47). La propia doc avisa que un solo video de 50 minutos generado con IA gasta los 100 créditos del plan Free ([MCP](https://docs.supadata.ai/integrations/mcp)).
- **Ingesta semanal**: ~1 Episodio por semana, ~2 créditos cada uno (transcripción + metadatos) = ~10 créditos por mes. Entra en Free, siempre que sea `native`.

## 7. Errores y reintentos

Formato de todos los errores ([Error Codes](https://docs.supadata.ai/errors/list)):

```json
{
  "error": "error-code",
  "message": "...",
  "details": "...",
  "documentationUrl": "https://docs.supadata.ai/errors/<error-code>"
}
```

| HTTP | `error`                  | Qué hacer                                                                                                                                                                                                                                                                                            |
| ---- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 206  | `transcript-unavailable` | No reintentar: es una respuesta definitiva, el video no tiene subtítulos ([error](https://docs.supadata.ai/errors/transcript-unavailable)).                                                                                                                                                          |
| 400  | `invalid-request`        | Corregir el pedido ([Error Codes](https://docs.supadata.ai/errors/list)).                                                                                                                                                                                                                            |
| 401  | `unauthorized`           | Key faltante, inválida o vencida ([Unauthorized](https://docs.supadata.ai/errors/unauthorized)).                                                                                                                                                                                                     |
| 402  | `upgrade-required`       | El endpoint no está en el plan ([Upgrade Required](https://docs.supadata.ai/errors/upgrade-required)).                                                                                                                                                                                               |
| 403  | `forbidden`              | Video privado, con login, solo para miembros, con restricción de edad o geobloqueado ([Transcript, "Video Accessibility"](https://docs.supadata.ai/get-transcript)).                                                                                                                                 |
| 404  | `not-found`              | El video no existe o es privado; también un job vencido ([Transcript](https://docs.supadata.ai/get-transcript)).                                                                                                                                                                                     |
| 429  | `limit-exceeded`         | Mirar `details`: `Global request rate limit was exceeded.` o `Request rate limit on current plan was exceeded.` → esperar y reintentar. `Plan usage limit was exceeded.` → se acabaron los créditos del mes; reintentar no sirve ([Limit Exceeded](https://docs.supadata.ai/errors/limit-exceeded)). |
| 500  | `internal-error`         | No se cobra y reintentar es seguro. Incluye el caso "el video tiene subtítulos pero no pudimos traerlos" ([Internal Error](https://docs.supadata.ai/errors/internal-error)).                                                                                                                         |
| 502  | `upstream-error`         | Solo para scraping web ([Error Codes](https://docs.supadata.ai/errors/list)).                                                                                                                                                                                                                        |

La doc no menciona un header `Retry-After` ni una política de backoff concreta: solo "back off and retry" para 429 y "retry after a few moments" para 500 ([Limit Exceeded](https://docs.supadata.ai/errors/limit-exceeded), [Internal Error](https://docs.supadata.ai/errors/internal-error)).

## 8. SDK oficial de JS

- Paquete: **`@supadata/js`** ([Node SDK](https://docs.supadata.ai/integrations/node)), repo [supadata-ai/js](https://github.com/supadata-ai/js). Su única dependencia es `cross-fetch` ([npm](https://www.npmjs.com/package/@supadata/js)).
- Transcripción: `supadata.transcript({ url, lang, text, chunkSize, mode })` → `Transcript | { jobId }`. Metadatos: `supadata.metadata({ url })` → `Metadata` ([Node SDK](https://docs.supadata.ai/integrations/node), [transcript.ts](https://github.com/supadata-ai/js/blob/main/src/services/transcript.ts)).
- Job: `supadata.transcript.getJobStatus(jobId)` hace **una sola consulta**. El SDK **no hace polling**, ni reintentos, ni tiene timeout: cada método es un `fetch` directo ([client.ts](https://github.com/supadata-ai/js/blob/main/src/client.ts), [transcript.ts](https://github.com/supadata-ai/js/blob/main/src/services/transcript.ts)). El polling lo escribimos nosotros.
- Los errores con status no-2xx se lanzan como `SupadataError` con `error`, `message`, `details` y `documentationUrl` ([Node SDK](https://docs.supadata.ai/integrations/node)).
- **Desfase de versiones**: la doc dice que `jobResult.result` requiere `@supadata/js >= 1.5.0` ([Transcript](https://docs.supadata.ai/get-transcript)). El repo está en 1.5.0, que mueve `content`/`lang`/`availableLangs` adentro de `result` ([package.json](https://github.com/supadata-ai/js/blob/main/package.json), [transcript.ts](https://github.com/supadata-ai/js/blob/main/src/services/transcript.ts)). Pero en npm la última versión publicada es **1.4.0** (`npm view @supadata/js dist-tags` al 2026-11-27). En 1.4.0, `getJobStatus` devuelve la respuesta cruda: el tipo dice `result`, pero los datos vienen en `content`, en el nivel superior.

## 9. Gotchas

1. **`mode=auto` es el default y puede salir caro.** Si un episodio no tiene subtítulos, genera con IA y cobra 2 créditos por minuto sin avisar ([Transcript](https://docs.supadata.ai/get-transcript)). En el backfill, un video sin subtítulos de 60 minutos cuesta lo mismo que 120 videos con subtítulos.
2. **Pedir `es` no garantiza español.** Si no hay `es`, viene otro idioma con 200 ([Transcript, "Languages"](https://docs.supadata.ai/get-transcript#languages)). Validar `lang === "es"` (o que empiece con `es`) en la respuesta.
3. **No sabemos si los subtítulos automáticos de YouTube cuentan como `native`.** No está documentado. Si los episodios solo tienen subtítulos automáticos y Supadata no los toma, `native` devuelve 206 y la única salida es `generate`. Verificarlo con `DPXp1zDXD2Q` antes del backfill: mirar el status, `availableLangs` y el header `x-billable-requests`.
   - **Verificado el 2026-11-27:** `DPXp1zDXD2Q` (Anécdota #307) devolvió la transcripción en español con `mode=native` (585 segmentos, 16:29), sin job ni 206.
   - **Muestra de 16 Episodios (2026-11-27):** 14 devolvieron transcripción con `native`. Dos dieron 206: #74 "Que bronca me dió esta anécdota" (`kPilbBs4xMY`) y #120 "Mi mamá nos salvó la vida" (`niZ9x1UThXU`). Para esos la única salida es `generate` o transcribir el audio.
4. **Con el SDK, el 206 no se lanza como error.** `fetch` considera 206 como `ok`, y el SDK solo lanza errores con `!response.ok`. Entonces `supadata.transcript()` devuelve el cuerpo `{ error: "transcript-unavailable", ... }` como si fuera un `Transcript` ([client.ts](https://github.com/supadata-ai/js/blob/main/src/client.ts)). Hay que chequear `"error" in result`. Lo mismo vale con `fetch` directo: no alcanza con `res.ok`.
5. **Unidades mezcladas**: `offset`/`duration` en milisegundos ([Transcript](https://docs.supadata.ai/get-transcript)); `media.duration` en segundos ([Metadata](https://docs.supadata.ai/get-metadata)). El link a YouTube "en el minuto donde empieza la Historia" usa `t=` en segundos, así que hay que dividir `offset` por 1000.
6. **`chunkSize` cambia la granularidad de los timestamps.** Agrupa segmentos hasta N caracteres ([Transcript](https://docs.supadata.ai/get-transcript)); con chunks grandes, el `offset` del corte de una Historia queda menos preciso. A la vez, menos chunks son menos tokens para el LLM.
7. **El plan Free permite 1 request por segundo** ([precios](https://supadata.ai/pricing)), y el polling cada 1 s también cuenta para el rate limit (aplica a todos los endpoints salvo `/v1/me`, [API Reference](https://docs.supadata.ai/api-reference/introduction)). Llamar a transcripción y metadatos en paralelo puede dar 429 en Free.
8. **Batch es de Pro en adelante** y cobra igual que las llamadas sueltas (1 crédito por video) ([Batch](https://docs.supadata.ai/youtube/batch)). No ahorra créditos; solo llamadas.
9. **Los resultados de un job duran 1 hora** ([Transcript](https://docs.supadata.ai/get-transcript)). Si una tarea de Trigger.dev muere entre el 202 y el polling, el job ya se cobró. Conviene guardar la transcripción apenas llega.
10. **Videos inaccesibles**: privados, con login, solo para miembros, con restricción de edad o geobloqueados devuelven 403/404. Los en vivo no se pueden transcribir ([Transcript](https://docs.supadata.ai/get-transcript)).

## Recomendación para el issue #1

- **Transcripción**: `GET https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=<ID>&lang=es&mode=native` (`text` omitido, o sea `false`, para tener segmentos con `offset`/`duration` en ms). Probar sin `chunkSize` y con algún valor (p. ej. 500–1000) para ver qué granularidad conviene darle al LLM. Fuente: [Transcript](https://docs.supadata.ai/get-transcript).
- **Título**: `GET https://api.supadata.ai/v1/metadata?url=https://www.youtube.com/watch?v=<ID>` y leer `title`. De ahí se sacan el número y el título del Episodio. Fuente: [Metadata](https://docs.supadata.ai/get-metadata). Ninguno de los dos endpoints deprecated (`/youtube/transcript`, `/youtube/video`).
- **`mode=native`, nunca `auto`**, para no generar con IA sin querer. Si un episodio da 206, se lo marca y se decide aparte (coincide con lo que dice [`objetivo.md`](../objetivo.md) sobre transcribir el audio solo si hace falta).
- **Validar la respuesta**: tratar 206 como "sin subtítulos" (también con el SDK, chequeando `"error" in result`), manejar igual un 202 con `jobId` aunque con `native` no debería pasar, y fallar si `lang` no es español.
- **Reintentos**: reintentar 5xx y 429 de rate limit con backoff; no reintentar 206, 4xx ni 429 de cuota (`Plan usage limit was exceeded.`).
- **SDK o `fetch`**: el SDK `@supadata/js` 1.4.0 no aporta polling ni reintentos y tiene el desfase de `result`. Con dos GET simples, un `fetch` directo con el header `x-api-key` es igual de corto y deja manejar el 206 sin sorpresas. Si se usa el SDK, fijar la versión y tener en cuenta el gotcha 4 y la sección 8.
- **Antes del backfill**: probar con `DPXp1zDXD2Q` y algunos episodios viejos para confirmar que `native` trae español (gotcha 3), y contratar un mes de Pro (~600 créditos en total). Free alcanza para el issue #1 y para la ingesta semanal.
