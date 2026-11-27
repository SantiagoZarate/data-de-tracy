import { drizzle } from "drizzle-orm/libsql";
import { relations } from "./relations.ts";

/**
 * Conexión a Turso. En local, `TURSO_DATABASE_URL` puede ser un archivo
 * (`file:.datos/local.db`) y no hace falta token.
 */
export function createDb(url: string, authToken?: string) {
  return drizzle({ connection: { url, authToken }, relations });
}

export type Db = ReturnType<typeof createDb>;
