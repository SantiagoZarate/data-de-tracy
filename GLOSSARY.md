# Anecdotas de Tracy

Sitio fan-made para que la comunidad del podcast reencuentre historias a partir de lo que recuerda.

## Contenido

**Episodio**:
Una publicación numerada del podcast en YouTube. El título lleva el número y un título propio, en uno de dos formatos: "Anécdota #307 - TÍTULO" (el actual) o "TÍTULO- Anécdotas #59" (el de los episodios viejos). Los videos del canal que no son Episodios (clips, anuncios, shorts) no se procesan. Contiene 0 o más Historias: casi siempre 1 o 2, muy rara vez más.
_Evitar_: video, capítulo, programa

**Historia**:
Un relato enviado por un oyente y leído al aire. Es la unidad que se busca, se filtra y se muestra como resultado. Pertenece a un único Episodio. Cada Historia tiene un título propio, generado a partir de su contenido. No hereda el del Episodio, que a veces se refiere al Bonus Track o a ninguna de las dos (ver [`docs/estructura-episodio.md`](docs/estructura-episodio.md)).
_Evitar_: anécdota, relato, post

**Tipo de historia**:
Si una Historia es `principal` (la historia central del Episodio) o `bonus` (cada historia extra que se lee después de la principal; casi siempre hay una sola).
_Evitar_: categoría, formato

**Bonus Track**:
Una Historia de tipo `bonus`. Al aire suele anunciarse con un "¡Bonus Track!" de uno de los conductores, aunque en la transcripción ese grito puede no aparecer o salir deformado. No es una entidad aparte: es una Historia más.
_Evitar_: historia extra, segunda historia

## Metadatos

**País**:
Una Historia tiene dos, cada uno opcional: el **país de la Historia** (donde ocurre) y el **país del remitente** (de donde es quien la envió). Pueden ser distintos: un argentino que cuenta algo que le pasó en Ámsterdam. Se guardan como código ISO, o vacíos si la Historia no lo dice.
_Evitar_: región, origen

**Temática**:
Una categoría de una lista fija y curada (terror, amor, familia, bizarro…). Cada Historia tiene entre 1 y 3.
_Evitar_: tag, etiqueta, género

**Corrección manual**:
Un valor de un metadato de una Historia que el admin cargó a mano. Re-procesar el Episodio nunca lo pisa.
_Evitar_: override, edición, ajuste

## Búsqueda

**Conversación**:
Un intercambio de varios mensajes con el chatbot en el que el usuario describe lo que recuerda y va afinando los resultados. No se guarda.
_Evitar_: chat, sesión, consulta

**Candidata**:
Una Historia que el sistema sugiere como posible respuesta en una Conversación, junto con el motivo por el que coincide.
_Evitar_: resultado, match, sugerencia
