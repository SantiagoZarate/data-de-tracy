<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ui-sdk

Before using ui-sdk, follow the `ui-sdk` skill if installed and read `node_modules/@ui-sdk/react/docs/llms.txt`. When building a custom primitive, also find the relevant section in `node_modules/@ui-sdk/react/docs/core.md` and read `rendering.md` in the same directory.

## Design

Read [design.md](design.md) before adding or changing user-facing UI, shared styles, or theme tokens.

## Lint and formatting

Use oxlint (`pnpm lint`, `pnpm lint:fix`) and oxfmt (`pnpm format`, `pnpm format:check`). The project does not use ESLint or Prettier.

## Language

- **English:** code identifiers, source file and directory names, `package.json` scripts, database tables and columns, `AGENTS.md`, and `design.md`.
- **Spanish:** site URLs (including route directories such as `app/historias/[id]`), UI copy, CLI messages, LLM prompts, comments, other project documentation, commits, and pull requests.
- Keep stored values shown in the UI in Spanish, using the [glossary](GLOSSARY.md) for story types (`principal`, `bonus`) and themes.

## Local database

`pnpm db:migrate` creates or updates `.datos/local.db`, and `pnpm save-results .datos/muestra/*.json` loads the sample data. Without `TURSO_DATABASE_URL`, the app and scripts read the file directly. To test over HTTP as in production, run `pnpm db:dev` to start a Turso server on the same file, then set `TURSO_DATABASE_URL=http://127.0.0.1:8080` in `.env.local`.
