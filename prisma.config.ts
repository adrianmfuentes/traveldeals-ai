import { defineConfig } from "prisma/config";

/**
 * Connection URL for Prisma CLI commands (migrate deploy, db push, studio).
 *
 * Prefers discrete `PG*` env vars and percent-encodes the password so a
 * password containing reserved characters (`$ : @ / ? #` …) survives being
 * placed in a connection string. Falls back to `DIRECT_URL` / `DATABASE_URL`
 * for local dev where those are set explicitly.
 */
function resolveDatabaseUrl(): string {
  const host = process.env.PGHOST ?? process.env.POSTGRES_HOST;

  if (host) {
    const user = encodeURIComponent(
      process.env.PGUSER ?? process.env.POSTGRES_USER ?? "postgres"
    );
    const password = encodeURIComponent(
      process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? ""
    );
    const port = process.env.PGPORT ?? "5432";
    const database =
      process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? "postgres";
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("No database configuration found (PGHOST or DATABASE_URL)");
  return url;
}

export default defineConfig({
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
