import "server-only";
import { createDb } from "./index.ts";

// Sin TURSO_DATABASE_URL (en local) se lee la base de .datos, que se llena con `pnpm save-results`.
export const db = createDb(
  process.env.TURSO_DATABASE_URL ?? "file:.datos/local.db",
  process.env.TURSO_AUTH_TOKEN,
);
