# Búsqueda híbrida en Turso, sin índice vectorial

La búsqueda combina dos listas con Reciprocal Rank Fusion. La primera sale de la búsqueda por palabras de SQLite (FTS5, con `remove_diacritics 2` y búsqueda por prefijo). Como FTS5 no tiene stemming en español, la búsqueda por prefijo lo compensa. La segunda sale de comparar los embeddings uno por uno con `vector_distance_cos`. Se embeben tanto fragmentos de transcripción como un resumen por Historia. Las ~20 Candidatas mejor rankeadas pasan al LLM. Los embeddings son de `text-embedding-3-small` (1536 dimensiones) vía AI Gateway: cambiar de modelo obliga a re-embeber todo y a migrar las columnas.

No usamos el índice vectorial (DiskANN) porque primero trae el top-k y recién después aplica los filtros. Con país, temática o tipo, eso puede devolver menos resultados de los pedidos. Con ~20k filas, comparar todo es exacto y alcanza. Si la búsqueda se vuelve lenta o nos acercamos al límite de filas leídas del free tier, agregamos el índice.

Ni la tabla FTS5 ni un eventual índice vectorial los genera Drizzle: van en migraciones SQL escritas a mano, y nunca se usa `drizzle-kit push` contra la base real. Usamos el motor clásico de libSQL, no el FTS experimental de Turso basado en Tantivy.
