# Anecdotas de Tracy — Objetivo de la plataforma

## Contexto

**Anecdotas de Tracy** es un podcast argentino en el que un grupo de 4 personas lee historias enviadas por sus seguidores. El podcast se hace desde Argentina, pero las historias llegan de todo el mundo.

- ~300 episodios publicados en **YouTube** y **Spotify**.
- Cada episodio tiene una historia principal. Algunos traen además una segunda historia, el **"Bonus Track"** (muy rara vez, más de una).
- Todo el contenido está en español.

## El problema

Con cientos de historias, es muy difícil volver a encontrar una en particular. Muchas veces uno recuerda detalles sueltos ("la de la abuela que se aparecía en el espejo", "una de México sobre un casamiento", "la del tipo que se quedó encerrado en un ascensor") pero no el número ni el título del episodio.

## El objetivo

Crear un sitio web para la comunidad del podcast donde cualquier oyente pueda **reencontrar una historia a partir de lo que recuerda**.

La pieza central es un **chatbot**: el usuario describe en lenguaje natural los detalles que recuerda y el sistema devuelve las historias candidatas más probables.

## Funcionalidades principales

### 1. Búsqueda conversacional (chatbot)

- El usuario describe detalles de la historia en español.
- El sistema sugiere las historias que mejor coinciden.
- El formato exacto del resultado (resumen, link, timestamp, reproductor, etc.) está por definir (ver Preguntas abiertas).

### 2. Exploración y filtros

- Filtrar historias por **país** (dónde ocurre o de dónde es quien la envió).
- Filtrar por **temática** (ej.: terror, amor, bizarro, familia…).
- Filtrar por **tipo**: historia principal o Bonus Track.
- Otros filtros a definir más adelante.

### 3. Ingesta de episodios

- **Backfill inicial**: importar los ~300 episodios existentes.
- **Ingesta continua**: detectar y procesar automáticamente los episodios nuevos a medida que se publican.
- Fuente prevista: transcripciones de los videos de YouTube obtenidas con **Supadata**.
- Cada episodio se separa en sus historias (principal + Bonus Track, si lo tiene), y cada historia se enriquece con sus metadatos (país, temática, etc.).

## Unidad principal: la historia

La búsqueda y los filtros trabajan sobre **historias**, no sobre episodios: un episodio casi siempre tiene 1 o 2 historias (rara vez más), y lo que el usuario recuerda es la historia.

## Público y acceso

- Sitio **público** para la comunidad de oyentes.
- **Sin autenticación** para los usuarios: buscar, explorar y usar el chatbot es abierto.
- Las operaciones internas (ingesta, re-procesamiento, administración) **no** son públicas y deben estar protegidas.
- Como el chatbot es abierto y usa un LLM, hace falta **limitar el uso** (rate limiting / protección contra bots) para controlar costos.

## Idioma

- La interfaz, el chatbot y la documentación van en **español**.

## Fuera de alcance (por ahora)

- Cuentas de usuario, favoritos o historial de escucha.
- Hosting propio del audio (se enlaza a YouTube / Spotify).

## Decisiones

Los términos están definidos en [`GLOSSARY.md`](../GLOSSARY.md). Las decisiones difíciles de revertir tienen su ADR en [`docs/adr/`](./adr/).

- **Proyecto fan-made**: sin la marca del podcast y con un aviso visible. Se muestran resúmenes, nunca transcripciones completas ([ADR 0001](./adr/0001-sitio-fan-made.md)). El repo es público.
- **Stack**: Next.js + TypeScript en Vercel, Turso + Drizzle, AI SDK vía AI Gateway ([ADR 0002](./adr/0002-stack-nextjs-vercel-turso.md)).
- **Búsqueda**: híbrida. Combina la búsqueda por palabras (FTS5) con embeddings de fragmentos de transcripción y de cada Historia (`text-embedding-3-small`). El LLM elige entre las ~20 mejores ([ADR 0003](./adr/0003-busqueda-hibrida-en-turso.md)).
- **Chatbot**: conversación de varios mensajes que no se guarda. Muestra Candidatas desde el primer mensaje y repregunta solo si hay ambigüedad. Si ninguna coincide bien, lo dice, hace una pregunta concreta y muestra las Candidatas débiles como "menos probables".
- **Cada Candidata muestra**: título, número de episodio, tipo, país, temáticas, un resumen de 2–3 líneas, por qué coincide y un link a YouTube en el minuto donde empieza la Historia. No hay reproductor embebido.
- **Exploración**: una grilla tipo YouTube con todas las Historias. Cada tarjeta lleva la miniatura del episodio, el número, el título, la bandera del país, las temáticas y, si corresponde, el badge de Bonus Track. Los filtros (país, temática, tipo) y un buscador por palabras van en la URL, con paginación, de más nuevas a más viejas. Cada Historia tiene su página de detalle. La exploración no usa LLM, así que sigue funcionando cuando se agota el presupuesto del chatbot.
- **Títulos**: el título del Episodio se muestra tal cual se publicó. Se sacan número y título de los dos formatos conocidos, "Anécdota #N - TÍTULO" y "TÍTULO- Anécdotas #N". Si un título no matchea ninguno, Jev (TypeSafe) decide si es un Episodio antes de bajar la transcripción; si duda, el video va a revisión manual ([investigación](./investigacion/typesafe.md)). Cada Historia lleva un título propio que genera el LLM, porque el del Episodio a veces describe el Bonus Track o ninguna Historia ([estructura de un Episodio](./estructura-episodio.md)).
- **Separación de historias**: el LLM lee la transcripción con timestamps y marca dónde empieza y termina cada Historia. Cada Historia es una carta de un oyente: empieza con un saludo a los conductores y termina con la despedida o el final del relato. El "¡Bonus Track!" ayuda a ubicar el corte, pero en la transcripción puede faltar o salir deformado ([estructura de un Episodio](./estructura-episodio.md)). Se validó a mano con una muestra de 16 Episodios (2026-11-27): los cortes de inicio y fin y la cantidad de Historias salieron bien en los 14 que tenían transcripción, incluido uno con dos Bonus Tracks (#100).
- **Metadatos**: los extrae el LLM y se publican sin revisión previa. El admin puede hacer Correcciones manuales, que re-procesar nunca pisa. Cada Historia guarda dos países como código ISO: dónde ocurre y de dónde es quien la envió. Los dos pueden quedar vacíos, porque no siempre se mencionan.
- **Temáticas**: lista fija, de 1 a 3 por Historia: Terror, Paranormal, Amor, Desamor, Familia, Amistad, Bizarro, Humor, Crimen, Trabajo, Viajes, Escuela, Famosos, Drogas, Triste, Polémica, Inmoral. Se revisó con la muestra de 16 Episodios y queda como está. Famosos, Inmoral y Desamor no aparecieron en la muestra, pero se mantienen.
- **Transcripciones**: solo Supadata, con `mode=native`. Alcanzan para separar Historias. Algunos Episodios no tienen subtítulos (en la muestra, #74 y #120): esos se marcan y se decide aparte si se transcribe el audio, pero eso no se construye ahora ([investigación](./investigacion/supadata.md)).
- **Spotify**: fuera de la v1. Solo se enlaza a YouTube.
- **Modelo de la ingesta**: `claude-haiku-5-5`. Con la muestra de 16 Episodios separó bien las Historias y sacó metadatos razonables, así que no hace falta uno más caro.
- **Ingesta**: una tarea semanal en Trigger.dev procesa los episodios nuevos. El backfill es un script local que usa la misma función ([ADR 0005](./adr/0005-ingesta-en-trigger-dev.md)).
- **Auth y admin**: no hay login ni páginas de admin. El único admin es el mantenedor, que re-procesa con scripts y corrige datos desde Drizzle Studio.
- **Costos**: el chatbot tiene un tope de USD 20/mes. Se protege con BotID, límite por IP y por Conversación (Upstash) y un presupuesto en el AI Gateway ([ADR 0004](./adr/0004-tope-de-costo-del-chatbot.md)).

## Preguntas abiertas

- Nombre y dominio del sitio.
- Modelo concreto para el chat.
