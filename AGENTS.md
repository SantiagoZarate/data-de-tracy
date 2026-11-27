<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ui-sdk

Antes de usar ui-sdk, seguí la skill `ui-sdk` si está instalada y leé `node_modules/@ui-sdk/react/docs/llms.txt`. Para construir un componente nuevo, además buscá por encabezado en `node_modules/@ui-sdk/react/docs/core.md` y leé `rendering.md`, que está al lado.

## Lint y formato

El linter es oxlint (`pnpm lint`, `pnpm lint:fix`) y el formateador es oxfmt (`pnpm format`, `pnpm format:check`). No hay ESLint ni Prettier.

## Idioma

- **En inglés**: todo lo que es código. Funciones, tipos, variables, constantes, campos, nombres de archivos y carpetas, scripts de `package.json`, y tablas y columnas de la base.
- **En español**: las URLs del sitio, porque las ve el usuario (las carpetas de rutas en `app/`, como `app/historias/[id]`); el texto que ve el usuario en el frontend, los mensajes de la CLI, el prompt del LLM, los comentarios, la documentación, los commits y los PRs.
- Los valores guardados que se muestran en la interfaz siguen en español, porque salen del [glosario](GLOSSARY.md): el tipo de Historia (`principal`, `bonus`) y las Temáticas.

## Base de datos local

`pnpm db:migrate` crea o actualiza `.datos/local.db`, y `pnpm save-results .datos/muestra/*.json` la llena con la muestra. Sin `TURSO_DATABASE_URL`, la app y los scripts leen ese archivo directo. Para probar por HTTP, como en producción, corré `pnpm db:dev` (un servidor de Turso sobre el mismo archivo) y poné `TURSO_DATABASE_URL=http://127.0.0.1:8080` en `.env.local`.
