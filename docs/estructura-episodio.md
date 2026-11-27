# Estructura de un Episodio

Cómo está armado un Episodio, para separar sus Historias con un LLM. Sale de leer las transcripciones de Supadata de tres Episodios (relevado el 2026-11-27):

| Episodio | Video | Duración | Historias |
|---|---|---|---|
| #59 "Se me apagó la tele en Ámsterdam" | `buk_00BqiDs` | 23:14 | principal + Bonus Track |
| #304 "Superespecial Halloween" | `foJC1WxCXLM` | 25:56 | principal + Bonus Track |
| #307 "Culebrón italiano" | `DPXp1zDXD2Q` | 16:29 | principal |

Hay que revisarlo con la muestra de ~20 Episodios antes del backfill.

## Secciones

| # | Sección | Cómo se reconoce | Está en |
|---|---|---|---|
| 1 | Promo | Un conductor promociona su show de stand-up y cierra con "…y arranca Anécdotas". | #304, #307 (no en #59) |
| 2 | Intro fija | Casi textual: "Si quieren compartir su anécdota, mándennos un mail… Aclaren si quieren que sea anónimo… Los dejamos con un nuevo capítulo de anécdotas". Después, música. | los tres |
| 3 | Charla | Los conductores charlan. Cierra con un pie a la lectura ("¿Algo para saber, Cristian?", "denle play") y música. | los tres |
| 4 | **Historia principal** | Una carta leída en voz alta (ver abajo). | los tres |
| 5 | Comentarios | Los conductores comentan la Historia. | los tres |
| 6 | **Bonus Track** | Otra carta. A veces un conductor la presenta antes ("llega otra anécdota de un viaje en Ámsterdam también"). | #59, #304 |
| 7 | Comentarios | Comentan el Bonus Track. | #59, #304 |
| 8 | Cierre | Agradecen a quien mandó la anécdota y al equipo ("Gracias … por la edición", "…por la postproducción de sonido") y se despiden ("nos vemos el próximo domingo"). | los tres |

Muy rara vez un Episodio trae más de un Bonus Track: se repiten las secciones 6 y 7.

## Cómo se ve una Historia

- **Empieza con un saludo a los conductores**: "Hola, chicos, ¿cómo anda?", "Hola, Nico, Cristian, Juani…", "hola equipo". Suele seguir con el pedido de anonimato, el nombre o de dónde es quien escribe ("mi nombre es Marcos, soy de la ciudad de La Plata").
- **Termina con una despedida** ("Les mando un beso grande", "Un abrazo grande y espero que les sirva para el programa") **o directamente con el final del relato**, sin despedida ("sobreviví para contarla").
- **Los conductores interrumpen la lectura** con comentarios, a veces de más de 30 segundos. Siguen siendo parte de la Historia: no la cortan.
- Los países suelen aparecer al principio, cuando quien escribe se presenta ("soy de La Plata") o ubica la historia ("estudiaba en Tucumán"). Pueden ser distintos: en #59 un argentino cuenta algo que le pasó en Ámsterdam. A veces no se menciona ninguno.

## El "¡Bonus Track!"

No se puede usar solo como marca de corte:

- En #59 aparece deformado: "bueno este ser bueno es track enviado por ti no hola nico" ("Bonus Track, enviado por Tino. Hola, Nico").
- En #304 no aparece en la transcripción.
- En #307 (sin Bonus Track) "bonus track" se dice dos veces en la charla del principio.

Lo que sí marca el Bonus Track es **una segunda carta, con su propio saludo**, después de los comentarios de la principal.

## El título del Episodio

No siempre describe la Historia principal:

- #307 "Culebrón italiano": describe la principal.
- #59 "Se me apagó la tele en Ámsterdam": describe el **Bonus Track** (la que se desmaya después de comer trufas).
- #304 "Superespecial Halloween": no describe ninguna.

Por eso cada Historia lleva un título propio, generado por el LLM. El del Episodio se guarda aparte.

Hay dos formatos de título: "Anécdota #307 - CULEBRÓN ITALIANO" (actual) y "Se Me APAGÓ La TELE En ÁMSTERDAM- Anécdotas #59" (viejo). A veces hay dos espacios antes del guion.

## Calidad de la transcripción

Las de los Episodios viejos son mucho peores: sin puntuación ni mayúsculas y con palabras deformadas ("anécdotas gnt rossini puntocom"). Hay que reconocer las secciones por su estructura, no por frases exactas.
