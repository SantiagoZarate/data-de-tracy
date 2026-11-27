# Correcciones manuales

1. Aplicá las migraciones con `pnpm db:migrate` y abrí Drizzle Studio con `pnpm exec drizzle-kit studio`. Usá las mismas variables de conexión (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`) para ambos comandos si querés trabajar sobre Turso. Sin ellas se usa `.datos/local.db`.
2. En `stories`, buscá la Historia por el ID de YouTube del Episodio (`episodeVideoId`) y su posición. Activá la marca del campo antes de editarlo: `titleCorrected`, `summaryCorrected`, `storyCountryCorrected`, `senderCountryCorrected` o `themesCorrected`.
3. Editá el valor en `stories`. Para las Temáticas, editá las filas de `story_themes` con el `storyId` de la Historia. Si querés volver a generar un campo automáticamente, desactivá su marca.

Para re-procesar uno o más Episodios que ya están guardados:

```sh
pnpm reprocess-episodes 74 100
```

El comando reutiliza el título guardado y pide solo la transcripción nativa a Supadata. Si una Historia corregida no se puede reconocer en su posición, deja el Episodio intacto y lo reporta para revisión.
