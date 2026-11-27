import { defineConfig } from "drizzle-kit";

// Las migraciones se generan con `drizzle-kit generate` y se revisan antes de aplicarlas.
// Nunca `drizzle-kit push` contra la base real (ver ADR 0003).
export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:.datos/local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
