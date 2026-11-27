# Stack: Next.js en Vercel, Turso + Drizzle, AI SDK

Todo el sistema (sitio, chatbot e ingesta) es una sola app en Next.js (App Router) con TypeScript, desplegada en Vercel. El chatbot usa el AI SDK a través del AI Gateway, así se puede cambiar de modelo sin tocar código. La base de datos es Turso (libSQL), con Drizzle como ORM. Elegimos Turso en lugar de Postgres + pgvector porque trae columnas de vectores nativas y el free tier mantiene los costos al mínimo. Un solo lenguaje y un solo deploy simplifican un proyecto mantenido por una sola persona.
