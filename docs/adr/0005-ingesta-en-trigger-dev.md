# La ingesta semanal corre en Trigger.dev; el backfill, en local

El procesamiento de un Episodio (transcripción con Supadata, separación en Historias con LLM, extracción de metadatos, embeddings y guardado) es una función común que no depende de dónde corre.

- **Ingesta continua**: una tarea programada de Trigger.dev revisa el feed RSS del canal los domingos, en horario de Buenos Aires, y repite el chequeo un par de veces hasta el martes. Cada video nuevo que siga el formato de título dispara una tarea por Episodio, con sus propios reintentos.
- **Backfill**: los ~300 episodios existentes se procesan una sola vez, con un script local que llama a la misma función. No usa Trigger.dev.

La app en Vercel solo lee la base y atiende el chatbot. No expone endpoints de ingesta ni de administración.

Elegimos Trigger.dev en lugar de GitHub Actions por tres motivos. Reintenta cada Episodio por separado. No tiene el problema de GitHub, que desactiva los cron de un repo público después de 60 días sin actividad. Y su plan gratuito (USD 5/mes de crédito) cubre de sobra una ejecución semanal; si se pasa, frena las tareas en vez de cobrar. La contra es que los logs se guardan solo 1 día.

Guardar un Episodio dos veces no crea duplicados, porque se identifica por el ID del video de YouTube. Eso hace falta igual: las claves de idempotencia de Trigger.dev solo evitan disparar dos veces la misma tarea, no que se repita su trabajo.

Las transcripciones nunca se commitean al repo, que es público (ver ADR 0001).
