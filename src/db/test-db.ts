import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, type Db } from "./index.ts";

/** Una base SQLite temporal con las migraciones aplicadas. Llamar a `close` al terminar. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "ndt-db-"));
  const db = createDb(`file:${join(dir, "test.db")}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  return {
    db,
    close: async () => {
      db.$client.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
